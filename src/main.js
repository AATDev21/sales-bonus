/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const discount = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;
    } else if (index === 1 || index === 2) {
        return seller.profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else { // Для всех остальных
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  if (!data) {
    throw new Error("Данные не переданы");
  }

  if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
    throw new Error("Данные продавцов невалидны или пусты");
  }

  if (!Array.isArray(data.products) || data.products.length === 0) {
    throw new Error("Данные продуктов невалидны или пусты");
  }

  if (
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Данные покупок невалидны или пусты");
  }

  if (typeof options !== "object" || options === null) {
    throw new Error("Опции должны быть объектом");
  }

  const { calculateRevenue, calculateBonus } = options;

  if (typeof calculateRevenue !== "function") {
    throw new Error("calculateRevenue должна быть функцией");
  }

  if (typeof calculateBonus !== "function") {
    throw new Error("calculateBonus должна быть функцией");
  }

  const sellersStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: new Map(),
  }));

  const sellersIndex = data.sellers.reduce((acc, seller) => {
    acc[seller.id] = seller;
    return acc;
  }, {});

  const productsIndex = data.products.reduce((acc, product) => {
    acc[product.sku] = product;
    return acc;
  }, {});

  const sellersStatsIndex = sellersStats.reduce((acc, stat) => {
    acc[stat.id] = stat;
    return acc;
  }, {});

  data.purchase_records.forEach((record) => {
    const sellerStat = sellersStatsIndex[record.seller_id];
    if (!sellerStat) return;

    sellerStat.sales_count++;

    record.items.forEach((item) => {
      const product = productsIndex[item.sku];
      if (!product) return;

      const revenue = calculateRevenue(item, product);
      const profit =
        (item.sale_price * (1 - item.discount / 100) - product.purchase_price) *
        item.quantity;

      sellerStat.revenue += revenue;
      sellerStat.profit += profit;

      if (!sellerStat.products_sold.has(product.sku)) {
        sellerStat.products_sold.set(product.sku, {
          product,
          revenue: 0,
          profit: 0,
          quantity: 0,
        });
      }

      const productStat = sellerStat.products_sold.get(product.sku);
      productStat.revenue += revenue;
      productStat.profit += profit;
      productStat.quantity += item.quantity;
    });
  });

  const sortedSellers = [...sellersStats].sort(
    (a, b) => b.profit - a.profit
  );

  const totalSellers = sortedSellers.length;
  sortedSellers.forEach((sellerStat, index) => {
    sellerStat.bonus = calculateBonus(index, totalSellers, sellerStat);
  });

  const result = sortedSellers.map((sellerStat) => {
    const topProducts = Array.from(sellerStat.products_sold.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      seller_id: sellerStat.id,
      name: sellerStat.name,
      revenue: +sellerStat.revenue.toFixed(2),
      profit: +sellerStat.profit.toFixed(2),
      sales_count: sellerStat.sales_count,
      bonus: +sellerStat.bonus.toFixed(2),
      top_products: topProducts.map((product) => ({
        sku: product.product.sku,
        name: product.product.name,
        revenue: +product.revenue.toFixed(2),
        profit: +product.profit.toFixed(2),
        quantity: product.quantity,
      })),
    };
  });

  return result;
}
