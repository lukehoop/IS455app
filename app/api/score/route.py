from http.server import BaseHTTPRequestHandler
import json
import sys
from pathlib import Path

# Add the pipeline directory to the path so we can import inference
# This ensures the API can find your inference script
current_dir = Path(__file__).resolve().parent
pipeline_dir = current_dir.parent.parent.parent / "pipeline"
sys.path.append(str(pipeline_dir))

from inference import run_inference

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Trigger the logic you've already tested in the terminal
            df_results = run_inference()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "status": "success",
                "rows_scored": len(df_results)
            }
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())