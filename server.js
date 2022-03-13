const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 5000;

const lista_produtos = {
    produtos: [
        { id: 1, descricao: "Arroz parboilizado 5Kg", valor: 25.00, marca: "Tio João"  },
        { id: 2, descricao: "Maionese 250gr", valor: 7.20, marca: "Helmans"  },
        { id: 3, descricao: "Iogurte Natural 200ml", valor: 2.50, marca: "Itambé"  },
        { id: 4, descricao: "Batata Maior Palha 300gr", valor: 15.20, marca: "Chipps"  },
        { id: 5, descricao: "Nescau 400gr", valor: 8.00, marca: "Nestlé"  },
    ]
};

app.set('views', './src/views');
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/produtos', (req, res) => {
    return res.json(lista_produtos.produtos);
});

app.get('/produtos/:id', (req, res) => {
    let id = req.params.id;
    let resposta = lista_produtos.produtos.find(f => f.id == id);
    if (resposta) {
        return res.json(resposta);
    }
    return res.status(404).json('Item não encontrado.');
});

app.post('/produtos', (req, res) => {
    let body = req.body;
    let erro = validarRequisicao(body);
    if (erro.length > 0) {
        return res.status(422).json();
    }
    let maiorId = Math.max.apply(Math, lista_produtos.produtos.map((p) => p.id));
    let produto = {
        id: maiorId ? maiorId + 1 : 1,
        descricao: body.descricao,
        valor: body.valor,
        marca: body.marca
    };
    lista_produtos.produtos.push(produto);
    return res.status(201).json();
});

app.put('/produtos/:id', (req, res) => {
    let id = req.params.id;
    let produto = lista_produtos.produtos.find(f => f.id == id);
    if (!produto) {
        return res.json('Item não encontrado.', 404);
    }
    let body = req.body;
    let erro = validarRequisicao(body);
    if (erro.length > 0) {
        return res.json(erro, 422);
    }
    produto.descricao = body.descricao;
    produto.valor = body.valor;
    produto.marca = body.marca;
    let index = lista_produtos.produtos.findIndex(obj => obj.id === produto.id);
    lista_produtos.produtos[index] = produto;
    res.status(200).json();
});

app.delete('/produtos/:id', (req, res) => {
    let id = parseInt(req.params.id);
    let index = lista_produtos.produtos.findIndex(obj => obj.id === id);
    if (index < 0) {
        return res.status(404).json('Item não encontrado.');
    }
    lista_produtos.produtos.splice(index, 1);
    return res.json();
});

app.listen(port, () => {
    console.log(`Listen on port ${port}`)
});

function validarRequisicao(body) {
    let erro = [];
    if (!body['descricao']) {
        erro.push('O campo "descricao" é obrigatório.');
    }
    if (!body['valor']) {
        erro.push('O campo "valor" é obrigatório.');
    }
    if (!body['marca']) {
        erro.push('O campo "marca" é obrigatório.');
    }
    return erro;
};
