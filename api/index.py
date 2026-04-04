from http.server import BaseHTTPRequestHandler
import json
import sys
import os

# This adds the root of your project to the python path so it can find your other files
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

# Now we import your actual logic
# If inference.py is in a folder called 'pipeline', use: from pipeline.inference import run_inference
from pipeline.inference import run_inference 

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Trigger your ML logic
            df_result = run_inference()
            
            # Prepare the response
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

    # Optional: allow GET for easy browser testing
    def do_GET(self):
        self.do_POST()