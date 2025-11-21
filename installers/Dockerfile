FROM python:3.11-slim

WORKDIR /app

# Rendszerfüggőségek
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python függőségek
COPY installers/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Alkalmazás másolása
COPY . .

# Mappák létrehozása
RUN mkdir -p logs data/cache data/memory projects

# Port
EXPOSE 8000

# Indítás
CMD ["python3", "main.py"]

