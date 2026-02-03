const axios = require('axios');
const mongoose = require('mongoose');

// Configuração da conexão com o MongoDB
const DATABASE_URL = "mongodb://mongo:root@localhost:27017/meu_busao?authSource=admin&retryWrites=true&w=majority";

// const DATABASE_URL = "mongodb+srv://marcus-lima:VeIJd1nWPSiruNsk@barba-club-develop.m5goi.mongodb.net/meu_busao?retryWrites=true&w=majority&appName=barba-club-develop"

// URL da API
const DATARIO_URL = "https://dados.mobilidade.rio/gps/sppo";

// Defina o Schema para os dados dos ônibus
const onibusSchema = new mongoose.Schema({
  id: String,
  ordem: String, // Campo único (identificador do ônibus)
  linha: String,
  latitude: String,
  longitude: String,
  datahora: Date, // Timestamp da API convertido para Date
  velocidade: String,
  datahoraenvio: Date, // Timestamp da API convertido para Date
  datahoraservidor: Date, // Timestamp da API convertido para Date
  timestamp: { type: Date, default: Date.now } // Timestamp de inserção no banco de dados
});

// Crie o modelo (collection) no MongoDB
const Onibus = mongoose.model('Onibus', onibusSchema);

// Função para formatar a data
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}+${hours}:${minutes}:${seconds}`;
}

// Função para atualizar o banco de dados
const updateDatabase = async () => {
  try {
    console.log('Começou a buscar');

    // 1. Definir as datas
    const now = new Date();
    const dataAtualMenosDuasHoras = new Date(now.getTime() - 1 * 60 * 60 * 1000); // Subtrai 1 hora

    // Formatar as datas corretamente
    const dataInicialFormatted = formatDate(dataAtualMenosDuasHoras);
    const dataFinalFormatted = formatDate(now);


    // 2. Montar a URL da API
    // const url = `${DATARIO_URL}`;
    const url = `${DATARIO_URL}?dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;
    console.log('URL da API:', url);

    // 3. Busca os dados da API
    const response = await axios.get(url);
    const data = response.data;

    console.log('Quantidade de dados recebidos:', data.length);
    console.log('Busca completa');

    // 4. Conecta ao banco de dados MongoDB
    await mongoose.connect(DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conectado ao MongoDB');

    // 5. Remove duplicados usando um Map (baseado no campo "ordem")
    const uniqueDataMap = new Map();
    for (const item of data) {
      if (!uniqueDataMap.has(item.ordem)) {
        uniqueDataMap.set(item.ordem, item);
      }
    }

    // Converte o Map de volta para um array
    const uniqueData = Array.from(uniqueDataMap.values());
    console.log('Novos dados:', uniqueData.length);

    // 6. Limpa a collection atual (opcional, dependendo da lógica)
    await Onibus.deleteMany({});
    console.log('Collection limpa');

    // 7. Insere os novos dados (sem duplicação)
    const novosDados = uniqueData.map(item => ({
      ordem: item.ordem,
      linha: item.linha,
      latitude: item.latitude,
      longitude: item.longitude,
      datahora: new Date(parseInt(item.datahora)), // Converte timestamp para Date
      velocidade: item.velocidade,
      datahoraenvio: new Date(parseInt(item.datahoraenvio)), // Converte timestamp para Date
      datahoraservidor: new Date(parseInt(item.datahoraservidor)), // Converte timestamp para Date
    }));

    await Onibus.insertMany(novosDados);
    console.log('Banco de dados atualizado com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar o banco de dados:', error);
  } finally {
    // Fecha a conexão com o MongoDB
    await mongoose.connection.close();
    console.log('Conexão com o MongoDB fechada');
  }
};

// Executa a atualização a cada 1 minuto
setInterval(updateDatabase, 60000);
