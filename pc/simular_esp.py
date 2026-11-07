"""Simula o comportamento da placa ESP32-CAM usando a webcam do computador.

Captura um quadro da webcam a cada N segundos, codifica em JPEG e envia via
HTTP POST para /analisar usando a chave de API (X-API-Key), imprimindo o
resultado exatamente como no Serial Monitor do ESP32.

Uso:
    python simular_esp.py [--url http://127.0.0.1:5000/analisar] [--camera 0] [--intervalo 5]
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import cv2

from servidor import chave_api


def main():
    ap = argparse.ArgumentParser(description="Simulador de ESP32-CAM usando a webcam local.")
    ap.add_argument("--url", default="http://127.0.0.1:5000/analisar", help="URL do endpoint /analisar")
    ap.add_argument("--camera", type=int, default=0, help="Índice da webcam (padrão: 0)")
    ap.add_argument("--intervalo", type=float, default=5.0, help="Intervalo entre envios em segundos (padrão: 5)")
    ap.add_argument("--api-key", default=None, help="Chave X-API-Key (padrão: lê de chave_api.txt / EXP_API_KEY)")
    args = ap.parse_args()

    token = args.api_key or chave_api()
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        sys.exit(
            f"ERRO: Não foi possível abrir a webcam (índice {args.camera}). "
            "Você também pode usar a webcam ou enviar fotos diretamente pelo Dashboard Web!"
        )

    print(f"Webcam aberta (índice {args.camera}).")
    print(f"Enviando fotos a cada {args.intervalo:.1f}s para {args.url} (Pressione Ctrl+C para parar)\n")

    try:
        while True:
            ok, quadro = cap.read()
            if not ok or quadro is None:
                print("ERRO: falha ao capturar quadro da webcam")
                time.sleep(2)
                continue

            ok_jpg, buf = cv2.imencode(".jpg", quadro, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
            if not ok_jpg:
                continue

            req = urllib.request.Request(
                args.url,
                data=buf.tobytes(),
                headers={
                    "Content-Type": "image/jpeg",
                    "X-API-Key": token,
                    "X-Origem": "webcam (simulador)",
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    dados = json.loads(resp.read().decode("utf-8"))
                    if dados.get("faces") == 0:
                        print("Nenhum rosto na imagem", flush=True)
                    else:
                        conf = round((dados.get("confidence") or 0) * 100)
                        print(f"Expressao: {dados.get('label')} ({conf}%)", flush=True)
            except urllib.error.HTTPError as e:
                print(f"ERRO: o servidor respondeu com o codigo {e.code}", flush=True)
            except Exception as e:
                print(f"ERRO: sem resposta do servidor ({e})", flush=True)

            time.sleep(args.intervalo)
    except KeyboardInterrupt:
        print("\nSimulador encerrado.")
    finally:
        cap.release()


if __name__ == "__main__":
    main()
