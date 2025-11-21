FROM python:3.11-slim

WORKDIR /app

# Rendszerfüggőségek
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python függőségek
COPY installers/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Alkalmazás másolása
COPY core/ /app/core/
COPY modules/ /app/modules/
COPY main.py /app/main.py

# Mappák létrehozása
RUN mkdir -p logs data/cache data/memory projects

# Port
EXPOSE 8000

# Indítás
CMD ["python3", "main.py"]

