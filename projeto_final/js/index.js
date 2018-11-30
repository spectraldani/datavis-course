import {
  baseCardsPromise,
  legalCardsPromise,
  types,
  typesColors
} from './cards.js';
import {  pokedexPromise } from './pokedex.js';
import { makePokeList, createPokémonIcon } from './icons.js';


function reduceAddAvg(attr) {
  return function(p,v) {
    ++p.count
    p.sum += v[attr];
    p.avg = p.sum/p.count;
    return p;
  };
}
function reduceRemoveAvg(attr) {
  return function(p,v) {
    --p.count
    p.sum -= v[attr];
    p.avg = p.sum/p.count;
    return p;
  };
}
function reduceInitAvg() {
  const obj = {count:0, sum:0, avg:0};
  obj.valueOf = function() {return this.avg;};
  return obj;
}

var currencyFormatter = d3.format(".2f");

let favoriteFirstGen = '1';
let firstGenSelector = document.querySelector('#gen1-favorite');

(async () => {
  const list = document.querySelectorAll('ol#list')[0];
  let cards = await baseCardsPromise;
  let pokedex = await pokedexPromise;
 
  let cfCards = crossfilter([...cards.values()]);
  let dimensions = {};
  let groups = {};
  let maps = {};
  window.pokedex = pokedex;
  window.groups = groups;
  window.dimensions = dimensions;
  window.maps = maps;
  
  dimensions.price = cfCards.dimension(x => x.price);
  dimensions.type = cfCards.dimension(x => x.types, true);
  dimensions.pokedexNumber = cfCards.dimension(x => x.nationalPokedexNumber);
  
  groups.priceByDex = dimensions.pokedexNumber.group().reduce(reduceAddAvg('price'), reduceRemoveAvg('price'), reduceInitAvg);
  groups.type = dimensions.type.group();

  maps.pricesByDex = new Map(groups.priceByDex.all().map(x=>[x.key, x.value]));

  function updateFirstGenFavorite() {
    let icon = createPokémonIcon(favoriteFirstGen);
    icon.style.float = 'left';
    icon.style.marginRight = '10px';
    firstGenSelector.childNodes[1].replaceWith(icon);

    document.querySelectorAll('.gen1f-name').forEach(x => {
      x.textContent = pokedex.get(favoriteFirstGen).name;
    })

    document.querySelectorAll('.gen1f-price').forEach(x => {
      if (maps.pricesByDex.get(+favoriteFirstGen)) {
          x.textContent = currencyFormatter(
            maps.pricesByDex.get(+favoriteFirstGen).avg
          ) + ' dólares';
      } else {
        x.textContent = "sem preço registrado"
      }
    })
  }
  updateFirstGenFavorite();

  for (let pokemon of pokedex.values()) {
    if (pokemon.generation != 1) continue;
    let option = document.createElement('option');
    option.value = pokemon.pokedexNumber;
    option.appendChild(document.createTextNode(pokemon.name));
    firstGenSelector.childNodes[3].appendChild(option);
  }
  firstGenSelector.childNodes[3].onchange = function(e) {
    favoriteFirstGen = e.target.value;
    updateFirstGenFavorite();
  }
  
  let chart;
  chart = dc.barChart("#gen1-types");
  chart.height(480)
       .x(d3.scaleBand())
       .xUnits(dc.units.ordinal)
       .yAxisLabel("Quantidade de Cartas")
       .colors(typesColors)
       .colorAccessor(d => d.key)
       .brushOn(true)
       .dimension(dimensions.type)
       .group(groups.type.reduceCount());
  
//   chart = dc.scatterPlot("#gen1-prices-by-dexnumber");
//   chart.height(480)
//        .x(d3.scaleBand())
//        .xUnits(dc.units.ordinal)
//        .y(d3.scaleLinear().domain(d3.extent(groups.priceByDex.all().map(x=>x.value))))
//        .yAxisLabel("Preço")
//        .brushOn(true)
//        .dimension(dimensions.priceByDex)
//        .group(groups.priceByDex);
  
  makePokeList('#gen1-prices-by-dexnumber', groups.priceByDex.top(10), (o) => {
    return [[o.key], `${pokedex.get(String(o.key)).name} ${currencyFormatter(o.value.avg)}\$`];
  })
  
  
  dc.renderAll();
})();