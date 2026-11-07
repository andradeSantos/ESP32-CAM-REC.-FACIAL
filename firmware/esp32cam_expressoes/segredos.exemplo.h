// Configuracoes desta placa.
// Copie este arquivo para segredos.h, na mesma pasta, e preencha os valores.
// O segredos.h fica fora do git: nunca publique a senha do Wi-Fi.

// Rede Wi-Fi de 2,4 GHz (o ESP32 nao conecta em 5 GHz).
const char *WIFI_SSID = "NOME_DA_REDE";
const char *WIFI_SENHA = "SENHA_DA_REDE";

// Endereco do servidor (local com http:// ou VPS em producao com https://).
// Exemplo local: "http://192.168.0.10:5000/analisar"
// Exemplo VPS:   "https://api.seudominio.com/analisar"
const char *SERVIDOR_URL = "http://IP_DO_PC:5000/analisar";

// Chave de API (header X-API-Key). Obrigatoria na VPS; opcional na rede local.
// O valor e exibido ao iniciar o servidor (e salvo em pc/chave_api.txt).
const char *SERVIDOR_API_KEY = "";
