# Property Management Project

## Setup Instructions

Follow these steps to set up and start the project locally:

1. **Clone the Repository**  
   ```bash
   git clone <repository-url>
   cd PropertyManagement
   ```

2. **Install Dependencies**  
   Ensure you have Node.js and npm installed. Then run:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**  
   Create a `.env` file in the root directory and add the required environment variables. Refer to `.env.example` if available.

4. **Set Up Python Virtual Environment (venv)**  
   If the project includes a backend written in Python, set up a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

5. **Run Database Migrations**  
   If the project uses a database, apply migrations:
   ```bash
   npm run migrate
   ```

6. **Start the Development Server**  
   Start the frontend server locally:
   ```bash
   npm start
   ```

7. **Start the FastAPI Server**  
   If the project includes a FastAPI backend, start the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   By default, the FastAPI server will run at `http://127.0.0.1:8000`.

8. **Access the Application**  
   Open your browser and navigate to `http://localhost:3000` (or the port specified in your configuration).

## Additional Notes

- Ensure your database is running if required.
- Check the project's documentation for any additional setup steps.
