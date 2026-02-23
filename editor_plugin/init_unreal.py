"""
init_unreal.py

Unreal Engine automatically executes this script upon startup if it's placed in
the Content/Python directory or exposed via a Plugin's Python path.

This script checks if the UE Angelscript Bridge is enabled and starts the HTTP server.
"""

import sys
import os

try:
    import unreal
    
    # Try to import and start the bridge
    try:
        import ue_angelscript_bridge
        
        # We start it slightly delayed to ensure the engine is fully initialized
        def _start_bridge():
            ue_angelscript_bridge.start()
            unreal.log("UE Angelscript Bridge auto-started from init_unreal.py")
            
        unreal.register_slate_post_tick_callback(lambda dt: _start_bridge())
        
    except ImportError:
        unreal.log_warning("ue_angelscript_bridge module not found. The MCP bridge will not be available.")
        
except ImportError:
    pass
