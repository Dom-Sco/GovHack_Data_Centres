from flask import Flask, render_template, send_from_directory
import os

app = Flask(__name__)

# Serve the main page
@app.route('/')
def index():
    return render_template('index.html')

# Serve GeoJSON files from /data folder
@app.route('/data/<filename>')
def geojson(filename):
    return send_from_directory(os.path.join(app.root_path, 'data'), filename)

if __name__ == '__main__':
    app.run(debug=True)
