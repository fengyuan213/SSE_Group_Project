# React + Flask (no database)

## Versions
Python 3.15.2<br>
pip 25.2<br>
Flask 3.1.2<br>
flask-cors 6.0.1<br>
python-dotenv 1.1.1<br>
node v22.12.0<br>
npm 10.9.0<br>
vite 10.9.0<br>

## Install on Local Machine
git clone https://github.com/fengyuan213/SSE_Group_Project.git <br>
cd SSE_Group_Project <br>

### Frontend
cd frontend <br>
npm install <br>
npm run dev (verify it's working correctly; check Manual run (terminals))

### Backend
cd backend <br>
python -m venv .venv <br>
\.venv\Scripts\activate

### Install required packages
pip install -r requirements.txt

flask run --port 5000 (verify it's working correctly; check below)

## Manual run (terminals)
Backend: <br>
  cd backend<br>
  \.venv\Scripts\activate<br>
  flask run --port 5000<br>
  Backend:  http://localhost:5000/api/health<br>

<img width="1716" height="232" alt="image" src="https://github.com/user-attachments/assets/749783ce-9f67-4702-bef2-45f44ab5d264" />

Frontend:<br>
  cd frontend<br>
  npm run dev<br>
