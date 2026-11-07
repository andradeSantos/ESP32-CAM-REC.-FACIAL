"""Ponto de entrada WSGI para execução em produção com Gunicorn.

Exemplo de uso (1 worker e 8 threads para compartilhar o estado do Painel em memória):
    gunicorn --workers 1 --threads 8 --timeout 30 --bind 0.0.0.0:5000 wsgi:app
"""

from servidor import chave_api, criar_app, senha_web

print(f"Senha da pagina: {senha_web()}", flush=True)
print(f"Chave de API (ESP32): {chave_api()}", flush=True)

app = criar_app()
