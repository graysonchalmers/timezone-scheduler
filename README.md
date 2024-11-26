# Timezone Meeting Scheduler

A web-based application for scheduling meetings across multiple timezones, built with Flask and modern JavaScript.

## Features

- Dynamic timezone comparison
- Real-time time conversion
- Visual time of day representation
- Time recommendation system
- Calendar integration (Google Calendar and .ics export)
- 12/24-hour time format toggle
- Responsive design

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/timezone-scheduler.git
cd timezone-scheduler
```

2. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Running Locally

1. Start the Flask development server:
```bash
python app.py
```

2. Open your browser and navigate to `http://localhost:5000`

## Docker Deployment

1. Build the Docker image:
```bash
docker build -t timezone-scheduler .
```

2. Run the container:
```bash
docker run -p 8000:8000 timezone-scheduler
```

3. Access the application at `http://localhost:8000`

## Alternative Deployment Options

### Replit
1. Create a new Repl and select "Import from GitHub"
2. Paste your repository URL
3. Click "Import from GitHub"
4. Replit will automatically detect the configuration and start the server
5. Click the "Run" button at the top
6. Your app will be available at your Replit URL

### Vercel
1. Install Vercel CLI:
```bash
npm i -g vercel
```
2. Deploy:
```bash
vercel
```

### Heroku
1. Create a new Heroku app:
```bash
heroku create
```
2. Deploy:
```bash
git push heroku main
```

## Tech Stack

- Backend: Flask
- Frontend: HTML, CSS, JavaScript
- Libraries:
  - Luxon (time manipulation)
  - Bootstrap (styling)
  - Select2 (timezone selection)

## License

MIT License
