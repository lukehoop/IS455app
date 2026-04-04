from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# 1. Add the root folder (..) to the path
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if root_path not in sys.path:
    sys.path.append(root_path)

# 2. Add the pipeline folder specifically so its files can find each other
pipeline_path = os.path.join(root_path, 'pipeline')
if pipeline_path not in sys.path:
    sys.path.append(pipeline_path)

# Now import your logic from the pipeline folder
from pipeline.inference import run_inference 

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Trigger your ML logic
            df_result = run_inference()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "status": "success",
                "message": f"Scored {len(df_result)} rows",
                "count": len(df_result)
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_response = {"status": "error", "message": str(e)}
            self.wfile.write(json.dumps(error_response).encode('utf-8'))
        
        return

    def do_GET(self):
        self.do_POST()