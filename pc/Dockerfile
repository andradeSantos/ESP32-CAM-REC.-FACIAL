FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    opencv-python-headless \
    onnxruntime \
    numpy \
    flask \
    gunicorn

COPY expressoes.py ./

# Baixa previamente os modelos ONNX (YuNet + HSEmotion) na imagem
RUN python -c "from expressoes import DetectorRostos, ClassificadorHSEmotion; DetectorRostos(); ClassificadorHSEmotion()"

COPY servidor.py wsgi.py validar.py simular_esp.py ./

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5000/health')"

CMD ["gunicorn", "--workers", "1", "--threads", "8", "--timeout", "30", "--bind", "0.0.0.0:5000", "wsgi:app"]
