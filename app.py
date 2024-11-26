from flask import Flask, render_template
import pytz

app = Flask(__name__)

@app.route('/')
def index():
    timezones = sorted(pytz.common_timezones)
    return render_template('index.html', timezones=timezones)

if __name__ == '__main__':
    app.run(debug=True)
