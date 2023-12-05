import { initializeApp } from "firebase/app";
import { doc, getDoc, getFirestore } from "firebase/firestore/lite";
import express from "express";
import bodyParser from "body-parser";

const app = express();
const db = getFirestore(
	initializeApp({
		apiKey: "AIzaSyCDQz7AqwNzzxVUrIh0crqCRh6yi3M8iIw",
		authDomain: "grocery-compass.firebaseapp.com",
		projectId: "grocery-compass",
		storageBucket: "grocery-compass.appspot.com",
		messagingSenderId: "372646887147",
		appId: "1:372646887147:web:5e8defcfeffc46833d48ae",
		measurementId: "G-8MLG35J267",
	})
);

// create an array of items, use them as args for my function inside app.get()
// return res.json() - the arg will be the resulting object from
app.post("/", bodyParser.json(), async (req, res) => {
	let groceryList = req.body;
	console.log("req.body:", req.body);
	let cheapestTJList = await getItems(groceryList, "Trader Joes");
	let cheapestSafewayList = await getItems(groceryList, "Safeway");
	let cheapestItems = compareCheapestItemsAcrossStores(
		cheapestTJList,
		cheapestSafewayList
	);
	console.log("cheapestItems:", cheapestItems);
	res.json(cheapestItems);
});

const port = process.env.port || 8080;

app.listen(port, () => {
	console.log("Server is running on port", port);
});

// ****************************** Functions to be used in the app.get() call **********************************

// getItems() takes in a list of grocery items for a specified store from the frontend
// for every item in the list, it queries the DB for the top 5 cheapest items in that category,
// and sends back the items' information to the frontend
// arguments: an array of items being searched and the store to search in
// returns: a list of the 5 cheapest items, with their price, for every item searched
async function getItems(itemsList, store) {
	let cheapestOfEachItem = [];
	let inventory = [];
	let docRef;

	// Get Trader Joes collection
	if (store.localeCompare("Trader Joes") == 0) {
		docRef = doc(db, "traderjoes_stored_by_array_test", "traderjoes0");
	}

	// Get Safeway collection
	if (store.localeCompare("Safeway") == 0) {
		docRef = doc(db, "stored_by_array_large_test", "safeway0");
	}

	const docSnap = await getDoc(docRef);

	if (docSnap.exists()) {
		const data = docSnap.data();
		inventory = data.product_array;

		// Convert each array entry to an object
		inventory = inventory.map((item) => JSON.parse(item));
	} else {
		// docSnap.data() will be undefined in this case
		console.log("No such document!");
	}

	// Sort inventory based on price
	inventory.sort((a, b) => {
		a.price = parseFloat(a.price);
		b.price = parseFloat(b.price);
		return a.price - b.price;
	});

	// For each grocery item, find the cheapest one
	let n = inventory.length;
	itemsList.forEach((item) => {
		for (let i = 0; i < n; i++) {
			let inventoryItem = inventory[i];
			if (inventoryItem.name.toLowerCase().includes(item.toLowerCase())) {
				cheapestOfEachItem.push({...inventoryItem, "store": store});
				return;
			}
		}
	});
	console.log("cheapestOfEachItem:", cheapestOfEachItem);

	return cheapestOfEachItem.slice(0, 5);
}

// compareCheapestItemsAcrossStores() takes the cheapest items from both stores,
// compares them and finds the overall 5 cheapest items per item searched
// assumes that arrays from both stores are the same length
//      - aka there were at least 5 items found at both stores per each item searched
// arguments: array of cheapest items from Trader Joes, array of cheapest items from Safeway
// returns: an array of the 5 overall cheapest items, for every item searched
function compareCheapestItemsAcrossStores(
	cheapestItemsTraderJoes,
	cheapestItemsSafeway
) {
	let combined = cheapestItemsSafeway
		.concat(cheapestItemsTraderJoes)
		.sort((a, b) => a.price - b.price);
	const overallCheapestItems = combined.slice(0, 5);
	console.log("overallCheapestItems:", overallCheapestItems);
	return overallCheapestItems;
}
