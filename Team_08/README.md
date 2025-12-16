<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
</head>
<body>

<div align="center">
  <h1>🏀 CourtVision: AI Basketball Analytics</h1>

  <p>
    <img src="https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python" alt="Python 3.11">
    <img src="https://img.shields.io/badge/YOLO-v12-orange?style=for-the-badge" alt="YOLOv12">
    <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit" alt="Streamlit">
    <img src="https://img.shields.io/badge/Docker-Enabled-2496ED?style=for-the-badge&logo=docker" alt="Docker">
  </p>

  <p>
    <strong>CourtVision</strong> is a professional-grade computer vision pipeline that turns raw basketball footage into actionable game intelligence. <br>
    By fusing state-of-the-art object detection (<strong>YOLOv12</strong>) with sensor fusion algorithms (<strong>Kalman Filters</strong>), it tracks players and the ball with high precision—even through occlusions—generating real-time stats like speed, distance, and shot trajectories.
  </p>

  <p>
    <em>Designed with a "batteries-included" philosophy, featuring a stunning, custom-styled Streamlit interface.</em>
  </p>
</div>

<hr>


<div align="center">
<h2>👥 Team-08</h2>

| USN | Student Name |
| :---: | :---: |
| **1CR22CS225** | V Mathesh |
| **1CR22CS079** | Kavya M |
| **1CR22CS226** | Poorab R Jain |

</div>
<hr>
<h2>✨ Key Features</h2>
<ul>
  <li><strong>⚡ Next-Gen Detection:</strong> Powered by a custom-trained <strong>YOLOv12</strong> model to detect players, referees, and the ball with exceptional accuracy.</li>
  <li><strong>🧠 Physics-Based Ball Tracking:</strong> Implements <strong>Kalman Filtering</strong> to predict ball trajectory, smoothing out detection jitter and maintaining track during occlusions.</li>
  <li><strong>📈 Advanced Analytics:</strong>
    <ul>
      <li><strong>Player Stats:</strong> Real-time calculation of player speed (m/s) and total distance covered.</li>
      <li><strong>Shot Visualization:</strong> Dynamic parabola fitting to visualize the arc of the ball in flight.</li>
      <li><strong>Pose Estimation:</strong> Optional integration with <strong>YOLOv8-Pose</strong> for full skeletal tracking.</li>
    </ul>
  </li>
  <li><strong>🎨 Pro UI:</strong> A "Dark Mode" optimized interface with custom CSS, metric cards, and instant visual feedback.</li>
  <li><strong>🍏 Apple Silicon Optimized:</strong> Native support for <strong>MPS (Metal Performance Shaders)</strong> to accelerate inference on macOS devices.</li>
</ul>

<hr>

<h2>🛠️ Tech Stack</h2>
<ul>
  <li><strong>Core:</strong> Python 3.11, OpenCV, NumPy</li>
  <li><strong>AI Models:</strong> Ultralytics YOLOv12 (Detection), YOLOv8 (Pose)</li>
  <li><strong>Tracking:</strong> ByteTrack, FilterPy (Kalman Filters)</li>
  <li><strong>Frontend:</strong> Streamlit (Custom CSS components)</li>
  <li><strong>Infrastructure:</strong> Docker, Render</li>
</ul>

<hr>

<h2>🚀 Getting Started</h2>

<h3>Option 1: Local Installation</h3>
<ol>
  <li><strong>Clone the repository:</strong>
    <pre><code>git clone https://github.com/cmrit-cse-rep/BEProjects_2026Team_08.git
cd courtvision</code></pre>
  </li>
  <li><strong>Install dependencies:</strong>
    <pre><code>pip install -r requirements.txt</code></pre>
    <em>(Note: Linux users may need system libraries like <code>ffmpeg</code> and <code>libgl1</code>)</em>
  </li>
  <li><strong>Run the App:</strong>
    <pre><code>streamlit run streamlit_app.py</code></pre>
  </li>
</ol>

<h3>Option 2: Docker (Recommended)</h3>
<p>Run the app in a containerized environment to avoid dependency conflicts.</p>
<ol>
  <li><strong>Build the image:</strong>
    <pre><code>docker build -t courtvision .</code></pre>
  </li>
  <li><strong>Run the container:</strong>
    <pre><code>docker run -p 8501:8501 courtvision</code></pre>
    Open your browser to <code>http://localhost:8501</code>.
  </li>
</ol>

<hr>

<h2>🧠 How It Works</h2>
<ol>
  <li><strong>Ingestion:</strong> Upload any standard basketball video (MP4, MOV, AVI).</li>
  <li><strong>Detection & ID:</strong> The system uses <strong>YOLOv12s</strong> to detect objects. Players are assigned unique IDs using <strong>ByteTrack</strong> to monitor them across frames.</li>
  <li><strong>State Estimation:</strong>
    <ul>
      <li><strong>Ball:</strong> A Linear Kalman Filter (<code>dim_x=4</code>, <code>dim_z=2</code>) estimates position and velocity, predicting the ball's location when detection fails.</li>
      <li><strong>Players:</strong> Movement vectors are calculated between frames to derive speed and distance metrics.</li>
    </ul>
  </li>
  <li><strong>Rendering:</strong> The pipeline draws bounding boxes, skeleton keypoints, and trajectory trails before re-encoding the video for playback.</li>
</ol>

<hr>

<h2>📂 Project Structure</h2>
<pre>
├── basket_main.py       # Local development script (OpenCV window)
├── detection.py         # YOLOv12 training configuration & script
├── streamlit_app.py     # Main web application & UI logic
├── Dockerfile           # Container setup for deployment
└── requirements.txt     # Project dependencies
</pre>

<hr>

<h2>🤝 Creator</h2>
<ul>
  <li><strong>Author:</strong> Mathesh</li>
  <li><strong>Models:</strong> Built on top of the incredible <a href="https://github.com/ultralytics/ultralytics">Ultralytics YOLO</a> framework.</li>
</ul>

<div align="center">
  <br>
  <sub>Built with ❤️ for the love of the game.</sub>
</div>

</body>
</html>

