import json
import queue
import threading
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

try:
    import unreal
    _HAS_UNREAL = True
except ImportError:
    _HAS_UNREAL = False

BRIDGE_HOST = "127.0.0.1"
BRIDGE_PORT = 3000

# ---------------------------------------------------------------------------
# Dispatcher to run tasks on the Game Thread
# ---------------------------------------------------------------------------
_work_queue = queue.Queue()
_tick_handle = None

def _dispatch_to_game_thread(handler_fn, params=None, timeout=30.0):
    result_holder = [None]
    done_event = threading.Event()
    _work_queue.put((handler_fn, params, done_event, result_holder))

    if done_event.wait(timeout=timeout):
        return result_holder[0]
    else:
        return {"error": f"Request timed out waiting for game thread ({timeout}s)"}

def _game_thread_tick(delta_time):
    while not _work_queue.empty():
        try:
            handler_fn, params, done_event, result_holder = _work_queue.get_nowait()
        except queue.Empty:
            break
            
        try:
            if params is not None:
                result_holder[0] = handler_fn(params)
            else:
                result_holder[0] = handler_fn()
        except Exception as e:
            tb = traceback.format_exc()
            result_holder[0] = {"error": str(e), "traceback": tb}
        finally:
            done_event.set()
            _work_queue.task_done()

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

def _handle_status():
    return {"status": "ok", "editor": "Unreal Engine with Angelscript"}

def _handle_level_actors():
    if not _HAS_UNREAL:
        return {"error": "Not running in Unreal Engine"}
    
    # We must use the EditorLevelLibrary
    # In UE5 it's in the EditorScriptingUtilities plugin
    try:
        actors = unreal.EditorLevelLibrary.get_all_level_actors()
    except Exception as e:
        return {"error": f"Failed to get level actors: {e}. Is EditorScriptingUtilities plugin enabled?"}
        
    result = []
    for actor in actors:
        result.append({
            "name": actor.get_name(),
            "label": actor.get_actor_label(),
            "class": actor.get_class().get_name(),
            "path": actor.get_path_name()
        })
    return {"actors": result}

def _handle_execute_python(body):
    if not _HAS_UNREAL:
        return {"error": "Not running in Unreal Engine"}
    
    code = body.get("code", "")
    if not code:
        return {"error": "No code provided"}
    
    import sys
    import io
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    redirected_output = sys.stdout = io.StringIO()
    redirected_error = sys.stderr = io.StringIO()

    try:
        local_vars = {"unreal": unreal}
        exec(code, {"__builtins__": __builtins__}, local_vars)
        
        result_data = local_vars.get("result", None)
        
        # Serialize UE objects simply
        if result_data and hasattr(result_data, "get_name"):
            result_data = result_data.get_name()
            
        return {
            "stdout": redirected_output.getvalue(),
            "stderr": redirected_error.getvalue(),
            "result": str(result_data) if result_data is not None else None
        }
    except Exception as e:
        tb = traceback.format_exc()
        return {
            "error": str(e),
            "traceback": tb,
            "stdout": redirected_output.getvalue(),
            "stderr": redirected_error.getvalue()
        }
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

_ROUTES_GET = {
    "/status": _handle_status,
    "/level/actors": _handle_level_actors,
}

_ROUTES_POST = {
    "/execute/python": _handle_execute_python,
}

# ---------------------------------------------------------------------------
# HTTP Server
# ---------------------------------------------------------------------------

class _BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _send_json(self, data, status=200):
        try:
            payload = json.dumps(data, default=str).encode("utf-8")
        except TypeError as e:
            payload = json.dumps({"error": f"JSON serialization error: {e}"}).encode("utf-8")
            status = 500
            
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(payload)

    def _read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        handler = _ROUTES_GET.get(parsed.path)
        if not handler:
            self._send_json({"error": "Not found", "path": parsed.path}, status=404)
            return
            
        try:
            if _HAS_UNREAL:
                result = _dispatch_to_game_thread(handler)
            else:
                result = handler()
            self._send_json(result)
        except Exception as e:
            self._send_json({"error": "Internal error", "traceback": traceback.format_exc()}, status=500)

    def do_POST(self):
        parsed = urlparse(self.path)
        handler = _ROUTES_POST.get(parsed.path)
        if not handler:
            self._send_json({"error": "Not found", "path": parsed.path}, status=404)
            return
            
        try:
            body = self._read_json_body()
            if _HAS_UNREAL:
                result = _dispatch_to_game_thread(handler, body)
            else:
                result = handler(body)
            self._send_json(result)
        except json.JSONDecodeError as exc:
            self._send_json({"error": "Invalid JSON body", "detail": str(exc)}, status=400)
        except Exception as e:
            self._send_json({"error": "Internal error", "traceback": traceback.format_exc()}, status=500)

_httpd = None
_thread = None

def start(host=BRIDGE_HOST, port=BRIDGE_PORT):
    global _httpd, _thread, _tick_handle
    if _httpd is not None:
        if _HAS_UNREAL:
            unreal.log_warning(f"Bridge already running on port {_httpd.server_port}")
        return

    _httpd = HTTPServer((host, port), _BridgeHandler)
    _thread = threading.Thread(target=_httpd.serve_forever, daemon=True)
    _thread.start()
    
    if _HAS_UNREAL:
        _tick_handle = unreal.register_slate_post_tick_callback(_game_thread_tick)
        unreal.log(f"UE Angelscript Bridge started on http://{host}:{port}")
    else:
        print(f"Bridge started on http://{host}:{port} (Offline Mode)")

def stop():
    global _httpd, _thread, _tick_handle
    if _httpd is not None:
        _httpd.shutdown()
        _httpd.server_close()
        _httpd = None
        _thread = None
        if _HAS_UNREAL and _tick_handle is not None:
            unreal.unregister_slate_post_tick_callback(_tick_handle)
            _tick_handle = None
            unreal.log("UE Angelscript Bridge stopped")

if __name__ == "__main__":
    start()
    if not _HAS_UNREAL:
        print("Running in offline test mode. Press Ctrl+C to stop.")
        try:
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            stop()
