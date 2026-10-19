import { useStore } from "../../context/StoreContext";
import { formatPrice } from "../../lib/format";

// Temporary menu list; the full storefront lands in a later commit
const Home = () => {
    const { foods, foodsState } = useStore();
    return (
        <div className="container" style={{ paddingTop: 32 }}>
            <div className="page-head">
                <div>
                    <span className="eyebrow">Menu</span>
                    <h1>What are you craving?</h1>
                </div>
            </div>
            {foodsState === "loading" && <div className="skeleton" style={{ height: 120 }} />}
            <ul style={{ display: "grid", gap: 8, listStyle: "none" }}>
                {foods.map((f) => (
                    <li key={f.id} className="card" style={{ padding: 16 }}>
                        {f.name} · {formatPrice(f.price)}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Home;
