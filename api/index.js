import express from "express";
import cors from "cors";


import Search from "./Search.js";
const app = express();
const port = 3001;

app.use(cors({
  // origin: 'https://rag-ui-eta.vercel.app', // Allow only this domain
  origin:'https://persona-snowy.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow these HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'] // Allow specific headers
}));
// app.use(cors({
//    origin:'http://localhost:5173'
// }))
app.use(express.json())

// POST endpoint to add a new message


app.use(Search);

app.use("/", (req, res) => {
  res.send("Server running succesfully");
});
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'https://rag-ui-eta.vercel.app');
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization',);
//   if (req.method === 'OPTIONS') {
//     return res.status(204).end(); // Respond to preflight request
//   }
//   next();
// });
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
