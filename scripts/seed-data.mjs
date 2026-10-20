// Zaika demo menu. Photos live in public/dishes (credits in public/dishes/CREDITS.md).

// Add-ons shared by several dishes
const RAITA = { label: "Extra raita", price: 30 };
const SALAN = { label: "Mirchi ka salan", price: 40 };
const NAAN = { label: "Butter naan", price: 59 };
const JEERA_RICE = { label: "Jeera rice", price: 89 };
const CHEESE = { label: "Extra cheese", price: 30 };

export const DISHES = [
    // Biryani
    { name: "Hyderabadi Chicken Dum Biryani", category: "biryani", isVeg: false, price: 329, image: "chicken-biryani",
      options: { spice: true, halfPrice: 199, addons: [RAITA, SALAN, { label: "Boiled egg", price: 25 }, { label: "Extra chicken piece", price: 89 }] },
      description: "Basmati and marinated chicken sealed and slow-cooked on dum with saffron, fried onions and mint. Comes with raita and salan." },
    { name: "Lucknowi Mutton Biryani", category: "biryani", isVeg: false, price: 399, image: "mutton-biryani",
      options: { spice: true, halfPrice: 249, addons: [RAITA, SALAN, { label: "Extra mutton piece", price: 119 }] },
      description: "Tender goat on the bone layered with fragrant rice, kewra and rose water, cooked the gentle Awadhi way." },
    { name: "Subz Dum Biryani", category: "biryani", isVeg: true, price: 259, image: "veg-biryani",
      options: { spice: true, halfPrice: 159, addons: [RAITA, SALAN, { label: "Extra paneer", price: 60 }] },
      description: "Seasonal vegetables and paneer in saffron rice with whole spices, caramelised onions and a squeeze of lime." },
    { name: "Egg Biryani", category: "biryani", isVeg: false, price: 249, image: "egg-biryani",
      options: { spice: true, halfPrice: 149, addons: [RAITA, { label: "Extra egg", price: 25 }] },
      description: "Masala-fried boiled eggs tucked into spiced basmati, finished with ghee and fresh coriander." },

    // North Indian
    { name: "Butter Chicken", category: "north-indian", isVeg: false, price: 349, image: "butter-chicken",
      options: { spice: true, halfPrice: 209, addons: [NAAN, JEERA_RICE, { label: "Extra butter", price: 20 }] },
      description: "Charred tandoori chicken in a velvety tomato, butter and fenugreek gravy. Best with butter naan." },
    { name: "Paneer Butter Masala", category: "north-indian", isVeg: true, price: 289, image: "paneer-butter-masala",
      options: { spice: true, halfPrice: 179, addons: [NAAN, JEERA_RICE] },
      description: "Soft paneer cubes simmered in a rich, gently sweet makhani gravy with cream and kasuri methi." },
    { name: "Dal Makhani", category: "north-indian", isVeg: true, price: 229, image: "dal-makhani",
      options: { spice: false, halfPrice: 139, addons: [NAAN, JEERA_RICE] },
      description: "Black lentils and rajma slow-cooked overnight with butter and cream. Smoky, silky, comforting." },
    { name: "Chole Bhature", category: "north-indian", isVeg: true, price: 199, image: "chole-bhature",
      description: "Punjabi chickpea curry with two puffed, golden bhature, pickled onions and green chilli." },
    { name: "Palak Paneer", category: "north-indian", isVeg: true, price: 259, image: "palak-paneer",
      options: { spice: true, halfPrice: 159, addons: [NAAN, JEERA_RICE] },
      description: "Fresh spinach puree tempered with garlic and cumin, folded with cottage cheese." },
    { name: "Butter Naan", category: "north-indian", isVeg: true, price: 59, image: "butter-naan",
      description: "Leavened bread baked in the tandoor and brushed with butter. Pairs with every curry." },
    { name: "Kashmiri Rogan Josh", category: "north-indian", isVeg: false, price: 389, image: "rogan-josh", isAvailable: false,
      options: { spice: true, halfPrice: 239, addons: [NAAN, JEERA_RICE] },
      description: "Slow-braised mutton in a deep red gravy of Kashmiri chilli, fennel and dry ginger." },

    // South Indian
    { name: "Masala Dosa", category: "south-indian", isVeg: true, price: 149, image: "masala-dosa",
      description: "Crisp fermented rice crepe filled with spiced potato, with coconut chutney and sambar." },
    { name: "Idli Sambar", category: "south-indian", isVeg: true, price: 109, image: "idli-sambar",
      description: "Three pillowy steamed rice cakes with piping hot sambar and two chutneys." },
    { name: "Medu Vada", category: "south-indian", isVeg: true, price: 119, image: "medu-vada",
      description: "Crunchy urad dal doughnuts with black pepper and curry leaves, served with sambar." },
    { name: "Onion Uttapam", category: "south-indian", isVeg: true, price: 139, image: "uttapam",
      description: "Thick, soft rice pancake topped with onion, tomato and green chilli, cooked on a cast-iron tawa." },
    { name: "Chicken Chettinad", category: "south-indian", isVeg: false, price: 339, image: "chicken-chettinad",
      options: { spice: true, halfPrice: 199, addons: [{ label: "Malabar parotta", price: 49 }, { label: "Steamed rice", price: 69 }] },
      description: "Fiery Karaikudi-style curry with freshly roasted pepper, star anise and coconut." },

    // Street food
    { name: "Pani Puri", category: "street-food", isVeg: true, price: 89, image: "pani-puri",
      description: "Eight crisp puris with spiced potato and chickpeas, tangy tamarind and mint pani on the side." },
    { name: "Mumbai Pav Bhaji", category: "street-food", isVeg: true, price: 149, image: "pav-bhaji",
      description: "Buttery mashed vegetable bhaji with two toasted pav, chopped onion and a wedge of lemon." },
    { name: "Punjabi Samosa", category: "street-food", isVeg: true, price: 59, image: "samosa",
      description: "Two flaky samosas stuffed with spiced potato and peas, with mint and tamarind chutneys." },
    { name: "Vada Pav", category: "street-food", isVeg: true, price: 59, image: "vada-pav",
      description: "Mumbai's favourite: a spiced potato fritter in a soft pav with dry garlic and green chutney." },
    { name: "Aloo Tikki Chaat", category: "street-food", isVeg: true, price: 99, image: "aloo-tikki-chaat",
      description: "Crisp potato patties topped with yoghurt, chutneys, sev and pomegranate." },

    // Rolls & wraps
    { name: "Chicken Tikka Kathi Roll", category: "rolls", isVeg: false, price: 179, image: "chicken-kathi-roll",
      options: { spice: true, addons: [CHEESE, { label: "Double egg", price: 25 }, { label: "Extra chicken", price: 60 }] },
      description: "Smoky chicken tikka, pickled onions and mint mayo rolled in a flaky egg paratha." },
    { name: "Paneer Tikka Roll", category: "rolls", isVeg: true, price: 159, image: "paneer-tikka",
      options: { spice: true, addons: [CHEESE, { label: "Extra paneer", price: 50 }] },
      description: "Tandoor-charred paneer and peppers with green chutney in a soft, flaky paratha." },
    { name: "Chicken Tikka (6 pcs)", category: "rolls", isVeg: false, price: 269, image: "chicken-tikka",
      options: { spice: true, halfPrice: 149, addons: [{ label: "Rumali roti", price: 39 }, { label: "Extra mint chutney", price: 15 }] },
      description: "Boneless chicken marinated in yoghurt and spices, charred in the tandoor, with mint chutney." },

    // Indo-Chinese
    { name: "Veg Hakka Noodles", category: "chinese", isVeg: true, price: 179, image: "hakka-noodles",
      description: "Wok-tossed noodles with crunchy vegetables, soy and a hint of chilli vinegar." },
    { name: "Chilli Chicken", category: "chinese", isVeg: false, price: 249, image: "chilli-chicken",
      description: "Crispy chicken tossed with peppers, onion, green chilli and dark soy. Dry or gravy, always hot." },
    { name: "Gobi Manchurian", category: "chinese", isVeg: true, price: 199, image: "veg-manchurian",
      description: "Crispy cauliflower florets glazed in a garlicky, sweet and spicy Manchurian sauce." },
    { name: "Chicken Fried Rice", category: "chinese", isVeg: false, price: 219, image: "fried-rice",
      description: "Smoky wok-fried rice with egg, chicken, spring onion and a dash of soy." },

    // Desserts
    { name: "Gulab Jamun (2 pcs)", category: "desserts", isVeg: true, price: 79, image: "gulab-jamun",
      description: "Soft khoya dumplings soaked in warm rose and cardamom syrup." },
    { name: "Rasmalai (2 pcs)", category: "desserts", isVeg: true, price: 99, image: "rasmalai",
      description: "Spongy chhena discs in chilled saffron milk with pistachio and almond." },
    { name: "Gajar ka Halwa", category: "desserts", isVeg: true, price: 109, image: "gajar-halwa",
      description: "Slow-cooked carrots with milk, ghee and cardamom, topped with roasted nuts." },
    { name: "Malai Kulfi", category: "desserts", isVeg: true, price: 89, image: "kulfi",
      description: "Dense, creamy frozen milk dessert with saffron and pistachio, on a stick." },

    // Beverages
    { name: "Mango Lassi", category: "drinks", isVeg: true, price: 99, image: "mango-lassi",
      description: "Thick yoghurt blended with Alphonso mango pulp and a pinch of cardamom." },
    { name: "Masala Chai", category: "drinks", isVeg: true, price: 49, image: "masala-chai",
      description: "Strong Assam tea brewed with milk, ginger, cardamom and cloves." },
    { name: "Nimbu Soda", category: "drinks", isVeg: true, price: 69, image: "nimbu-soda",
      description: "Fresh lime, soda and a little black salt. Sweet, salted or both." },
    { name: "Filter Coffee", category: "drinks", isVeg: true, price: 59, image: "filter-coffee",
      description: "South Indian decoction with frothy hot milk, served in a traditional dabara." },
];
