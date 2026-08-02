const product = {
  id: "gid://shopify/Product/123",
  title: "经典 T 恤",
  price: 199,
  available: true,
};
const Button = ({ variant = "primary", disabled, onClick, children }) => {
  return (
    <button
      className={`button button-${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

const Card = ({ title, children }) => {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="card-content">{children}</div>
    </section>
  );
};

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <Card title={product.title}>
      <p>¥{product.price}</p>
      <Button
        onClick={() => onAddToCart(product.id)}
        disabled={!product.available}
      >
        {product.available ? "加入购物车" : "暂时缺货"}
      </Button>
    </Card>
  );
};

const App = () => {
  const handleAddToCart = (productId) => {
    console.log("加入购物车", productId);
  };
  return <ProductCard product={product} onAddToCart={handleAddToCart} />;
};

export default App;
