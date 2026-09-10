# SmartBuild 3D

SmartBuild 3D is a professional house planning web application designed to help users plan, estimate, and evaluate residential construction projects in India.

## Features
- **User Authentication**: Secure registration and login system.
- **Project Management**: Save and manage multiple house planning projects.
- **Material Selection**: Choose from various qualities of bricks, flooring, roofing, etc.
- **Cost Estimation**: Get approximate 2024 construction estimates based on Tier-1 city rates.
- **Risk Analysis**: View location-specific environmental risks (seismic, flood, cyclone) for 50+ major Indian cities.
- **Layout Templates**: Standardized layout suggestions based on Indian residential norms from 1BHK to 5BHK villas.

## Technology Stack
- **Backend**: Python, Flask
- **Database**: SQLite with Flask-SQLAlchemy
- **Authentication**: Session-based auth with Werkzeug password hashing
- **Frontend**: HTML templates (to be implemented by frontend team), REST APIs returning JSON
- **Data Storage**: JSON-based static data for fast retrieval of materials, costs, and risks.

## Project Structure
```text
construct your house/
│
├── app.py                  # Main Flask application and API routes
├── requirements.txt        # Python dependencies
├── README.md               # Project documentation
│
└── data/                   # Static JSON data layer
    ├── materials.json      # Material options and prices
    ├── cost_rates.json     # Base construction rates
    ├── location_risk.json  # NDMA/IMD based risk profiles for cities
    ├── house_layouts.json  # Standard layout templates
    └── DATA_SOURCES.md     # Documentation on data origins and disclaimers
```

## How to Install
1. Ensure Python 3.8+ is installed.
2. Clone this repository or download the files.
3. Open a terminal in the project directory.
4. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```

## How to Run
1. Start the Flask application:
   ```bash
   python app.py
   ```
2. The database (`smartbuild.db`) will be automatically created on the first run.
3. Access the application in your web browser at: `http://localhost:5000`

## Demo Credentials Instructions
To use the application, you need an account. 
1. Navigate to `http://localhost:5000/register` (or use the API).
2. Enter a name, email, and password to register a new account.
3. You will be automatically logged in and redirected to the dashboard.

## Known Limitations
- The cost estimates are approximate and based on 2024 Tier-1 Indian city rates. They are not exact quotes.
- Risk data is generalized at the city level and does not account for micro-zoning or specific site conditions.
- The application currently uses SQLite, which is suitable for development and light usage, but would need to be migrated to PostgreSQL or MySQL for large-scale production deployment.
- Frontend HTML templates are required to fully utilize the page routes defined in `app.py`.

## Viva Questions

**Q1: What framework did you use for the backend and why?**
A: We used Flask (Python). It is lightweight, easy to set up, and provides the exact tools needed to build REST APIs and serve templates without unnecessary bloat.

**Q2: How is user data secured?**
A: Passwords are hashed using `werkzeug.security` (`generate_password_hash` with pbkdf2:sha256). We never store plain-text passwords. Session management is handled securely via Flask's secret key.

**Q3: How does the application handle data persistence?**
A: We use SQLite for relational data (Users and Projects) via Flask-SQLAlchemy (an ORM). For static reference data like materials and risk profiles, we read directly from JSON files to reduce database load.

**Q4: What is the purpose of the `@login_required` decorator?**
A: It is a custom decorator that intercepts requests to protected routes. If the user's ID is not present in the Flask session (meaning they aren't logged in), it redirects them to the login page, preventing unauthorized access.

**Q5: How is project configuration data stored?**
A: The `Project` model has a `data_json` text column. This allows us to store flexible, schema-less JSON strings representing the user's customized floor plan, materials, and cost selections without creating overly complex relational tables.

**Q6: Where does the location risk data come from?**
A: It is aggregated from publicly available NDMA (National Disaster Management Authority) and IMD (Indian Meteorological Department) zoning data, specifically focusing on seismic zones, floods, and cyclones.

**Q7: How would you scale this application?**
A: I would migrate the database from SQLite to PostgreSQL, implement a caching layer (like Redis) for the static JSON data reads, and deploy the Flask app using Gunicorn behind an Nginx reverse proxy.

**Q8: Why are API routes separate from page routes?**
A: Separation of concerns. Page routes serve HTML for traditional server-side rendering, while API routes return JSON, allowing a modern frontend (like React or Vue) or a mobile app to interact with the backend seamlessly in the future.

**Q9: What happens if a city isn't found in the risk analysis API?**
A: The `/api/data/risk/<city>` route checks if the city exists in the JSON data. If not, it returns a 404 HTTP status code with a JSON error message `{"error": "City not found"}`.

**Q10: Are the construction costs accurate?**
A: They are approximate estimates for educational and preliminary planning purposes based on 2024 rates. Actual costs fluctuate based on local contractors, exact site conditions, and real-time material market prices.

## License
MIT License. See LICENSE file for more details.
