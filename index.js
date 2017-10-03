const express = require('express');
const app = express();
const PORT = process.env.PORT || 3500;

app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Server listening on: ${PORT}`);
});
