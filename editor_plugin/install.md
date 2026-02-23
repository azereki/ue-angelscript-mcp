# Installing the Editor Bridge

The Editor Bridge allows the MCP Server to communicate directly with your running Unreal Engine Editor via an HTTP server.

## Installation

You have two options to run the Python Bridge:

### Option 1: Manual Run (Per-Session)
In your Unreal Engine Editor, open the Output Log, switch the command mode to `Python`, and paste the following:

```python
import sys
# Update this to point to the actual path where you cloned this repository
sys.path.append(r"F:\ue-angelscript-mcp\editor_plugin")
import ue_angelscript_bridge
ue_angelscript_bridge.start()
```

### Option 2: Auto-Start (Recommended)
You can configure Unreal Engine to automatically start the bridge every time you open the editor.

1. Ensure the **Python Editor Script Plugin** is enabled in your Unreal Engine project.
2. In your game project, create a `Content/Python` folder if it doesn't exist.
3. Copy both `ue_angelscript_bridge.py` and `init_unreal.py` into your project's `Content/Python` folder.
4. Restart your Editor.

You will see `UE Angelscript Bridge started on http://127.0.0.1:3000` in your Output Log.

## Security Warning
This bridge exposes a local REST API that can execute arbitrary Python commands inside your editor. **Do not expose port 3000 to the public internet.**
