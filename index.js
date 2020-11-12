const config = require('./config/default.json')
// const Binance = require('node-binance-api')
const Binance = require('node-binance-api-ext')
const express = require('express')
const jsonfile = require('jsonfile')

const binance = new Binance().options({
  APIKEY: config.apikey,
  APISECRET: config.apisecret
});


const closeAll = new Promise((resolve, reject) => {
  const pos = binance.futures.positionRisk()
  resolve(pos)
}).then(pos => {
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
}).finally(() => {
  console.log('сделки закрыты');
})

async function buyAsyncBTC() {
  try {
    //закрываем ордера
    await closeAll

    //определить цену BTC
    const priceAll = await binance.futures.prices()
    //находим цену BTC
    const priceBTC = parseFloat(priceAll.BTCUSDT)

    //считаем на сколько взять позицию
    const leverage = 5
    const sumUSDT = 20 * 80 / 100 //берем на 80% от депо 20$
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
    await binance.futures.sell('BTCUSDT', (positionAmt).toFixed(3), (entryPrice+(entryPrice * (0.05 / leverage))).toFixed(0) )
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.4, priceBTC1 * 1.05)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.3, priceBTC1 * 1.1)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.2, priceBTC1 * 1.3)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.1, priceBTC1 * 1.5)

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
    const leverage = 5
    const sumUSDT = 20 * 80 / 100 //берем на 80% от депо 20$
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
    await binance.futures.buy('BTCUSDT', (positionAmt).toFixed(3), (entryPrice-(entryPrice * (0.05 / leverage))).toFixed(0) )
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.4, priceBTC1 * 1.05)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.3, priceBTC1 * 1.1)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.2, priceBTC1 * 1.3)
    // await binance.futures.sell('BTCUSDT', countPos1 * 0.1, priceBTC1 * 1.5)

  } catch (e) {
    console.error(e);
  } finally {
    console.log('position comlete');
  }
}
// sellAsyncBTC()
