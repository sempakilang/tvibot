const config = require('./config/default.json')
// const Binance = require('node-binance-api')
const TelegramBot = require('node-telegram-bot-api');
const Binance = require('node-binance-api-ext')
const express = require('express')
const bodyParser = require('body-parser');
const jsonfile = require('jsonfile')

const app = express()
const PORT = process.env.PORT || 80

const bot = new TelegramBot(process.env.TGTOKEN, {polling: true});

bot.on('message', msg => {
  bot.sendMessage(msg.chat.id, `Hello from ME, bot "Hi, ${msg.from.first_name}"`)
})

app.get('/', (req, res) => {
  res.end('<h1>Home page</h1>')
})

app.get('/u6fqR4Q89q058hm75VR9', (req, res) => {
  res.status(200).end(` <div><a href="/u6fqR4Q89q058hm75VR9buy">buy</a></div>
            <div><a href="/u6fqR4Q89q058hm75VR9sell">sell</a></div>
            <div><a href="/u6fqR4Q89q058hm75VR9stop">stop</a></div>
    `)
})
app.get('/u6fqR4Q89q058hm75VR9buy', (req, res) => {
  buyAsyncBTC()
  res.status(200).end('<div><a href="/u6fqR4Q89q058hm75VR9">back</a></div>')
})
app.get('/u6fqR4Q89q058hm75VR9sell', (req, res) => {
  sellAsyncBTC()
  res.status(200).end('<div><a href="/u6fqR4Q89q058hm75VR9">back</a></div>')
})
app.get('/u6fqR4Q89q058hm75VR9stop', (req, res) => {
  stopBTC()
  res.status(200).end('<div><a href="/u6fqR4Q89q058hm75VR9">back</a></div>')
})

app.use(bodyParser.json())
app.post('/5t8WO9qaGdUGQfCEfhDZ', (req, res) => {
  console.log("req:", req.body);
  if (req.body.signal == 'long') {
    buyAsyncBTC()
  } else if (req.body.signal == 'short') {
    sellAsyncBTC()
  }
  jsonfile.writeFileSync("websoketData.txt", req.body, { flag: 'a' })
  res.status(200).end()
})

app.listen(PORT, () => {
  console.log('Server started')
})

const binance = new Binance().options({
  APIKEY: process.env.APIKEY,
  APISECRET: process.env.APISECRET
})
const leverage = 10

async function closeAll() {
  try {
    const pos = await binance.futures.positionRisk()
    const posData = pos.filter(item => item.symbol == 'BTCUSDT')
    const positionAmt = parseFloat(posData[0].positionAmt)
    //закрываем позицию long/short
    if (positionAmt > 0) {
      binance.futures.marketSell('BTCUSDT', positionAmt)
    } else if (positionAmt < 0) {
      binance.futures.marketBuy('BTCUSDT', positionAmt * -1)
    } else {
      console.log('сделок нет');
    }
    //закрываем ордера
    binance.futures.cancelAll('BTCUSDT')
  } catch (e) {
    console.error(e);
  } finally {
    console.log('сделки закрыты');
  }
}

async function stopBTC() {
  try {
    await closeAll
    await binance.futures.leverage('BTCUSDT', leverage)
  } catch (e) {
    console.error(e);
  } finally {
    console.log('position closed');
  }
}

async function buyAsyncBTC() {
  try {
    //закрываем ордера
    await closeAll

    //определить цену BTC
    const priceAll = await binance.futures.prices()
    //находим цену BTC
    const priceBTC = parseFloat(priceAll.BTCUSDT)

    //считаем на сколько взять позицию
    const balance = await binance.futures.account()
    const sumUSDT = balance.availableBalance * 80 / 100 //берем на 80% от депо $
    const countPos = (parseFloat(sumUSDT / priceBTC * leverage)).toFixed(3)

    //встаем в позицию
    const poss = await binance.futures.marketBuy( 'BTCUSDT', countPos )

    //записываем в файл
    const json = JSON.stringify(poss);
    jsonfile.writeFileSync("data.txt", json, { flag: 'a' })

    //возвращаем позицию
    const itemPosAfter = await binance.futures.positionRisk()

    const itemPosData = itemPosAfter.filter(item => item.symbol == 'BTCUSDT')
    console.log('itemPosData: ', itemPosData)

    const positionAmt = parseFloat(itemPosData[0].positionAmt)
    const entryPrice = parseFloat(itemPosData[0].entryPrice)

    //stopLimit 10%
    await binance.futures.stopMarketSell('BTCUSDT', (positionAmt).toFixed(3), (entryPrice-(entryPrice * (0.1 / leverage))).toFixed(0) )

    //Limits (40%-5% / 30%-10% / 20%-30% / 10%-50%)
    await binance.futures.sell('BTCUSDT', (positionAmt * 0.5).toFixed(3), (entryPrice+(entryPrice * (0.05 / leverage))).toFixed(0) )
    await binance.futures.sell('BTCUSDT', (positionAmt * 0.5).toFixed(3), (entryPrice+(entryPrice * (0.1 / leverage))).toFixed(0) )

  } catch (e) {
    console.error(e);
  } finally {
    console.log('position comlete');
  }
}
// buyAsyncBTC()

async function sellAsyncBTC() {
  try {
    //закрываем ордера
    await closeAll

    //определить цену BTC
    const priceAll = await binance.futures.prices()
    //находим цену BTC
    const priceBTC = parseFloat(priceAll.BTCUSDT)

    //считаем на сколько взять позицию
    const balance = await binance.futures.account()
    const sumUSDT = balance.availableBalance * 80 / 100 //берем на 80% от депо $
    const countPos = (parseFloat(sumUSDT / priceBTC * leverage)).toFixed(3)

    //встаем в позицию
    const poss = await binance.futures.marketSell( 'BTCUSDT', countPos )

    //записываем в файл
    const json = JSON.stringify(poss);
    jsonfile.writeFileSync("data.txt", json, { flag: 'a' })

    //возвращаем позицию
    const itemPosAfter = await binance.futures.positionRisk()

    const itemPosData = itemPosAfter.filter(item => item.symbol == 'BTCUSDT')
    console.log('itemPosData: ', itemPosData)

    const positionAmt = parseFloat(itemPosData[0].positionAmt) * -1
    const entryPrice = parseFloat(itemPosData[0].entryPrice)

    //stopLimit 10%
    await binance.futures.stopMarketBuy('BTCUSDT', (positionAmt).toFixed(3), (entryPrice+(entryPrice * (0.1 / leverage))).toFixed(0) )

    //Limits (40%-5% / 30%-10% / 20%-30% / 10%-50%)
    await binance.futures.buy('BTCUSDT', (positionAmt * 0.5).toFixed(3), (entryPrice-(entryPrice * (0.05 / leverage))).toFixed(0) )
    await binance.futures.buy('BTCUSDT', (positionAmt * 0.5).toFixed(3), (entryPrice-(entryPrice * (0.1 / leverage))).toFixed(0) )

  } catch (e) {
    console.error(e);
  } finally {
    console.log('position comlete');
  }
}
// sellAsyncBTC()
