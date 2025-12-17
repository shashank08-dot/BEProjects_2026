# ---- Base Python image ----
FROM python:3.10

# Set working directory
WORKDIR /app

# ---- Install Node.js for building React frontend ----
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm --version && node --version && \
    rm -rf /var/lib/apt/lists/*

# ---- Install system dependencies (OpenCV + Tesseract) in one layer ----
RUN apt-get update && apt-get install -y \
    libgl1 libglib2.0-0 libsm6 libxrender1 libxext6 \
    tesseract-ocr libtesseract-dev libleptonica-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

# ---- Copy and install Python dependencies FIRST ----
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# ---- Install numpy workaround ----
RUN pip install --no-cache-dir "numpy>=2.0,<2.3" && \
    pip install --no-cache-dir fasttext-wheel==0.9.2 && \
    pip uninstall -y numpy && \
    pip install --no-cache-dir "numpy==1.26.4"

# ---- Copy backend code ----
COPY backend/ /app/backend/

# ---- Copy frontend and build ----
COPY frontend/ /app/frontend/
RUN cd /app/frontend && \
    npm install --legacy-peer-deps && \
    npm run build && \
    npm cache clean --force

# ---- Move built frontend to Flask ----
RUN mkdir -p /app/backend/static /app/backend/templates && \
    cp -r /app/frontend/build/static/* /app/backend/static/ && \
    cp /app/frontend/build/index.html /app/backend/templates/index.html && \
    rm -rf /app/frontend/node_modules

# ---- Expose port ----
EXPOSE 7860

# ---- Start Flask server ----
CMD ["python", "/app/backend/api.py"]