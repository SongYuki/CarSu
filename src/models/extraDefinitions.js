export default function extraDefinitions({
  Order,
  OrderItem,
}){
  Order.hasMany(OrderItem, {
    as: 'items',
    foreignKey: 'orderId',
  });
}
