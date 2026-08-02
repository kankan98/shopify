import { useState } from "react";
const App = () => {
  const [title, setTitle] = useState("T 恤");
  const [stock, setStock] = useState(10);
  const [image, setImage] = useState("https://example.com/product.png");
  const [isDisabled, setIsDisabled] = useState(false);

  const addToCart = () => {
    setStock(stock - 1);
    console.log("加入购物车");
  };

  return (
    <>
      <div className="product-card">
        <label htmlFor="product-title">商品名称</label>
        <input
          id="product-title"
          className="text-input"
          value={title}
          disabled={isDisabled}
          readOnly
        />
        <img src={image} alt={title} />
        <p style={{ margin: 0, color: "red" }}>当前库存：{stock}</p>
        {/* 库存大于 0 时显示 */}
        {stock > 0 && <button onClick={addToCart}>加入购物车</button>}
        <br />
      </div>
      <p>{stock > 0 ? "商品可以正常购买" : "暂时缺货"}</p>
    </>
  );
};

export default App;
