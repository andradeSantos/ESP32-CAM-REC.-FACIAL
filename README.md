# ESP32-CAM: Reconhecimento de Expressões Faciais

A placa **ESP32-CAM** tira uma foto a cada 5 segundos e a envia pelo Wi-Fi para o servidor. O backend detecta o rosto (**YuNet**) e classifica a expressão facial aparente (**HSEmotion** / **FER+**: *neutro, feliz, surpreso, triste, raiva, nojo* ou *medo*), exibindo o diagnóstico em tempo real no **Serial Monitor** e em um **Dashboard Web** protegido por senha.

> **Nota:** O resultado indica a expressão aparente na imagem, não o estado emocional real da pessoa.

---

## Arquitetura do Projeto

O repositório é dividido em três partes principais:

| Pasta | Componente | Porta Padrão | Descrição |
|---|---|---|---|
| `pc/` | **Backend / API Python** | `5000` | Servidor Flask/Gunicorn com modelos ONNX (`YuNet` + `HSEmotion`), endpoint `POST /analisar`, painel HTML leve embutido e scripts de vídeo/simulação. |
| `web/` | **Dashboard Web (Next.js)** | `5001` | Interface moderna com diagnóstico em tempo real, histórico da sessão, upload de fotos e **simulador de ESP32 via webcam** direto no navegador. |
| `firmware/` | **Firmware ESP32-CAM** | `80` / `81` | Sketch Arduino (`esp32cam_expressoes.ino`) que captura quadros JPEG e envia periodicamente ao servidor. |

---

## 1. Como Subir COM Docker (Recomendado)

Com o Docker e o Docker Compose, o backend Python (já com os modelos ONNX baixados na imagem) e o Dashboard Next.js sobem juntos e pré-configurados.

### Pré-requisitos
- **Docker** e **Docker Compose** instalados.
- As portas **`5001`** e **`5000`** livres na máquina hospedeira (feche qualquer instância local de `servidor.py` antes de subir os containers).

### Passo a passo

1. **Garanta que os arquivos de senha/chave existam** (evita que o Docker crie diretórios vazios ao montar os volumes em um clone novo):
   ```bash
   touch pc/senha_web.txt pc/chave_api.txt
   ```
   *(Se estiver no Windows PowerShell: `New-Item -ItemType File -Force pc/senha_web.txt, pc/chave_api.txt`)*

2. **Construa e inicie os containers em segundo plano:**
   ```bash
   docker compose up -d --build
   ```

3. **Verifique se os dois containers estão ativos e com as portas mapeadas:**
   ```bash
   docker compose ps
   ```
   A saída esperada deve mostrar `0.0.0.0:5000->5000/tcp` na `api` e `0.0.0.0:5001->5001/tcp` no `web`:
   ```text
   NAME                      SERVICE   STATUS                   PORTS
   esp32cam-expressoes-api   api       Up (healthy)             0.0.0.0:5000->5000/tcp
   esp32cam-expressoes-web   web       Up                       0.0.0.0:5001->5001/tcp
   ```

4. **Consulte a senha do Dashboard e a chave de API do ESP32:**
   ```bash
   docker compose logs api
   ```
   Ou leia diretamente os arquivos gerados em `pc/`:
   ```bash
   cat pc/senha_web.txt
   cat pc/chave_api.txt
   ```

5. **Acesse o Dashboard no navegador:**
   - **Dashboard completo (Next.js):** [http://localhost:5001](http://localhost:5001)
   - **Página compacta da API (Flask):** [http://localhost:5000](http://localhost:5000)

### Comandos úteis do Docker
- **Recriar containers** (útil se a porta 5000 estava ocupada na primeira tentativa):
  ```bash
  docker compose up -d --force-recreate
  ```
- **Parar e remover os containers:**
  ```bash
  docker compose down
  ```

---

## 2. Como Subir SEM Docker (Execução Local)

Você pode rodar apenas o servidor Python (que já possui uma página simples na porta `5000`) ou rodar o servidor Python junto com o Dashboard Next.js (na porta `3000`).

### Pré-requisitos
- **Python 3.10+**
- **Node.js 20+** e **npm** (necessários apenas se quiser o Dashboard Next.js da pasta `web/`)

---

### Passo A: Subir o Backend / API Python (`pc/`)

Os modelos de IA (`YuNet` e `HSEmotion`) são baixados automaticamente para `pc/modelos/` na primeira execução.

#### No Linux / macOS:
```bash
cd pc
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Inicia o servidor aceitando conexões da rede local (porta 5000)
python servidor.py --host 0.0.0.0
```
*(Para rodar com Gunicorn em produção no Linux: `pip install gunicorn && gunicorn --workers 1 --threads 8 --timeout 30 --bind 0.0.0.0:5000 wsgi:app`)*

#### No Windows (PowerShell ou atalhos `.bat`):
```powershell
cd pc
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe servidor.py --host 0.0.0.0
```
No Windows, você também pode usar os atalhos na raiz do projeto:
1. Na primeira vez, dê dois cliques em `Liberar firewall.bat` (permite conexões na porta 5000 na rede privada).
2. Dê dois cliques em `Iniciar servidor.bat` e mantenha a janela aberta.

Ao iniciar, o terminal exibirá a **Senha da página** (também salva em `pc/senha_web.txt`) e a **Chave de API** (salva em `pc/chave_api.txt`).
Nesse momento, a interface básica já estará acessível em [http://127.0.0.1:5000](http://127.0.0.1:5000).

---

### Passo B: Subir o Dashboard Web Next.js (`web/`)

Com o backend Python rodando na porta `5000`, abra **outro terminal** e inicie o frontend:

#### Modo Desenvolvimento:
```bash
cd web
npm install
BACKEND_URL=http://127.0.0.1:5000 npm run dev
```

#### Modo Produção (Standalone):
```bash
cd web
npm ci
npm run build
BACKEND_URL=http://127.0.0.1:5000 PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Acesse [http://localhost:3000](http://localhost:3000) e entre com a senha exibida pelo servidor Python (ou contida em `pc/senha_web.txt`).

> **Deploy em VPS Linux (systemd):** Na pasta `deploy/` estão disponíveis os arquivos de unidade `expressoes-api.service` e `expressoes-web.service` para execução contínua via `systemd` sem Docker.

---

## 3. Gravar o Firmware na Placa ESP32-CAM

### O que é preciso
- Placa **ESP32-CAM AI Thinker** com base USB **ESP32-CAM-MB**
- Rede Wi-Fi de **2,4 GHz** (o ESP32 não conecta em redes de 5 GHz)
- **Arduino IDE** com o pacote de placas `esp32` instalado

### Passo a passo
1. Na pasta `firmware/esp32cam_expressoes/`, copie `segredos.exemplo.h` para `segredos.h`.
2. Edite `segredos.h` e preencha:
   - `WIFI_SSID` e `WIFI_SENHA`: nome e senha da sua rede Wi-Fi 2,4 GHz.
   - `SERVIDOR_URL`: endereço do servidor no PC, por exemplo `"http://192.168.0.10:5000/analisar"`.
   - `SERVIDOR_API_KEY`: chave gerada em `pc/chave_api.txt` (opcional na rede local quando `EXP_ALLOW_LOCAL_NO_KEY=true`; obrigatória em VPS/internet).
3. Abra `firmware/esp32cam_expressoes/esp32cam_expressoes.ino` no Arduino IDE.
4. Em **Tools > Board**, escolha **AI Thinker ESP32-CAM**.
5. Em **Tools > Port**, escolha a porta serial da placa (costuma aparecer como CH340 / ttyUSB0).
6. Clique em **Upload**.
7. Abra o **Serial Monitor** em `115200` baud e aperte o botão **RST** da placa.

### Endereços servidos pela placa
| Endereço | O que faz |
|---|---|
| `http://<ip-da-placa>:81/stream` | Vídeo MJPEG ao vivo |
| `http://<ip-da-placa>/capture` | Uma foto JPEG instantânea |
| `http://<ip-da-placa>/status` | JSON com resolução, qualidade, PSRAM e sinal Wi-Fi (`rssi`) |

---

## 4. Testar sem a Placa ESP32-CAM

Você pode testar todo o fluxo de detecção e classificação mesmo sem a placa física:

1. **Pelo Dashboard Web (`http://localhost:3000`):**
   - **Webcam ao Vivo:** ative a webcam do computador para capturar quadros avulsos ou clique em **Simular Placa (Auto 5s)** para enviar fotos automaticamente a cada 5 segundos.
   - **Enviar Arquivo:** faça upload de qualquer imagem JPG, PNG ou WEBP (até 5 MB).
2. **Pelo Simulador em Python (`pc/simular_esp.py`):**
   ```bash
   cd pc
   python simular_esp.py --url http://127.0.0.1:5000/analisar --intervalo 5
   ```
3. **Por qualquer cliente HTTP (`curl`, Postman, etc.):**
   ```bash
   curl -X POST http://127.0.0.1:5000/analisar \
     -H "Content-Type: image/jpeg" \
     -H "X-API-Key: $(cat pc/chave_api.txt)" \
     --data-binary @foto.jpg
   ```
   Exemplo de resposta:
   ```json
   {"status": "OK", "expression": "happy", "label": "feliz", "confidence": 0.91, "faces": 1, "box": [120, 80, 180, 180]}
   ```

| `status` | Quando acontece |
|---|---|
| `OK` | Expressão identificada com confiança acima do limiar (40%) |
| `INCONCLUSIVE` | Confiança abaixo de 40%: `label` vem `"inconclusivo"` e `expression` vem `null` |
| `NO_FACE_DETECTED` | Nenhum rosto detectado: `expression`, `label` e `confidence` vêm `null` e `faces` vem `0` |
| `INVALID_IMAGE` | Erro 400: o corpo da requisição não é uma imagem válida |
| `IMAGE_TOO_LARGE` | Erro 413: imagem maior que 5 MB |

---

## 5. Outros Modos de Uso

### Publicar na internet via Cloudflare Tunnel
Para expor temporariamente o servidor local na internet com HTTPS e proteção por senha:
- **Windows:** dê dois cliques em `Publicar na internet.bat`.
- **Linux / Terminal:** execute `python pc/publicar.py`.

### Vídeo ao vivo no PC (`expressoes.py`)
Conecta diretamente ao stream MJPEG da placa (`http://<ip>:81/stream`) e desenha as caixas e expressões em uma janela OpenCV:
- **Windows:** dê dois cliques em `Iniciar expressoes.bat`.
- **Linux / Terminal:** `python pc/expressoes.py <ip-da-placa>` (adicione `--modelo ambos` para comparar HSEmotion e FER+ lado a lado).
- Na janela do vídeo: pressione `s` para salvar captura em `pc/capturas/` ou `q` para sair.

### Medir a qualidade do modelo (`validar.py`)
```bash
cd pc
python validar.py dados/fer2013_test
```
*(Adicione `--modelo ferplus` para avaliar o FER+ ou `--com-detector` para imagens não recortadas).*

Resultado nos 7.178 testes do FER-2013:

| Expressão | FER+ | HSEmotion |
|---|---|---|
| Neutro | 91% | 55% |
| Feliz | 87% | 79% |
| Surpresa | 77% | 43% |
| Raiva | 38% | 49% |
| Triste | 24% | 47% |
| Nojo | 16% | 62% |
| Medo | 6% | 38% |
| **Acurácia geral** | **56,5%** | **54,8%** |
| **Média por classe** | **48,5%** | **53,1%** |

---

## 6. Problemas Comuns

| Sintoma | Causa e Solução |
|---|---|
| **Não consigo entrar no Dashboard mesmo com os containers levantados** | Verifique `docker compose ps`. Se `esp32cam-expressoes-api` estiver com a coluna `PORTS` em branco, a porta `5000` estava ocupada por outro processo quando o container foi criado, deixando-o sem rede. Feche o processo que usa a porta 5000 e rode `docker compose up -d --force-recreate`. |
| **Onde encontro a senha do Dashboard?** | No arquivo `pc/senha_web.txt` ou rodando `docker compose logs api`. Para gerar uma nova senha, apague o conteúdo de `pc/senha_web.txt` e reinicie o servidor/container. |
| **`Ja existe um servidor aberto na porta 5000`** | Outra instância do `servidor.py` ou o container Docker `esp32cam-expressoes-api` já está usando a porta 5000. Encerre um deles antes de iniciar o outro. |
| **`nao conectou no Wi-Fi` no Serial Monitor** | Confira o nome e a senha em `segredos.h` e certifique-se de que a rede Wi-Fi é de **2,4 GHz**. |
| **`sem resposta do servidor` no Serial Monitor** | Verifique se o servidor/container está rodando, se o IP em `SERVIDOR_URL` corresponde ao IP do PC na rede local e se o firewall permite conexões na porta 5000. |
| **`ERRO: o servidor respondeu com o codigo 401` na placa** | Preencha `SERVIDOR_API_KEY` em `segredos.h` com o valor de `pc/chave_api.txt` ou defina `EXP_ALLOW_LOCAL_NO_KEY=true` no servidor. |
| **Imagem preta na câmera** | Verifique se há película protetora na lente, pouca iluminação ou cabo flat da câmera mal encaixado. |
