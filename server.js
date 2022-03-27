require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('knex')({
    client: 'pg',
    debug: true,
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    }
});

const app = express();
const port = process.env.PORT || 5000;

const checkToken = (req, res, next) => {
    let authToken = req.headers['authorization'];
    if (!authToken) {
        return res.status(401).json({message: 'Autenticação requerida'});
    }
    let token = authToken.split(' ')[1];
    req.token = token;
    jwt.verify(req.token, process.env.SECRET_KEY, (err, tokenDecodificado) => {
        if (err) {
            return res.status(401).json({message: 'Acesso negado'});
        }
        req.usuarioId = tokenDecodificado.id;
        return next();
    });
}

const isAdmin = (req, res, next) => {
    knex.select('*')
        .from('usuario')
        .where({id: req.usuarioId})
        .then((usuarios) => {
            if (usuarios.length) {
                let usuario = usuarios[0];
                let roles = usuario.roles.split(';');
                if (roles.includes('ADMIN')) {
                    return next();
                }
                return res.status(403).json({message: 'Você não tem permissões suficientes para executar esta ação.'});
            }
        })
        .catch(err => {
            res.status(500).json({
                message: 'Erro ao recuperar permissões de usuário - ' + err.message
            });
        })
}

app.set('views', './src/views');
app.set('view engine','ejs');

app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.render('index');
});

/**
 * Rotas de produtos
 */

app.get('/api/produtos', checkToken, (req, res) => {
    knex.select('*').from('produto')
        .then(response => res.status(200).json(response))
        .catch(err => {
            res.status(500).json({
                message: 'Erro ao recuperar produtos - ' + err.message
            });
        });
});

app.get('/api/produtos/:id', checkToken, (req, res) => {
    let id = req.params.id;
    knex.select('*').from('produto').where({id: id})
        .then(response => res.status(200).json(response[0]))
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao recuperar produto: ' + err.message
            });
        });
});

app.post('/api/produtos', checkToken, isAdmin, (req, res) => {
    let body = req.body;
    let erro = validarProduto(body);
    if (erro.erros.length > 0) {
        return res.status(422).json(erro);
    }
    let produto = setProduto(body);
    knex.insert(produto)
        .into('produto')
        .then(response => res.status(201).json())
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao processar produto: ' + err.message
            });
        });
});

app.put('/api/produtos/:id', checkToken, isAdmin, (req, res) => {
    let id = req.params.id;
    let body = req.body;
    let erro = validarProduto(body);
    if (erro.erros.length > 0) {
        return res.status(422).json(erro);
    }
    produto = setProduto(body);
    knex('produto')
        .where({id: id})
        .update(produto)
        .then(response => res.status(200).json())
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao processar produto: ' + err.message
            });
        });
});

app.delete('/api/produtos/:id', checkToken, isAdmin, (req, res) => {
    let id = parseInt(req.params.id);
    knex('produto')
        .where({id: id})
        .delete()
        .then(response => res.status(200).json())
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao processar produto: ' + err.message
            });
        });
});

/**
 * Rotas de segurança
 */

 app.post('/api/seguranca/registrar', (req, res) => {
    let body = req.body;
    let erro = validarUsuario(body);
    if (erro.erros.length > 0) {
        return res.status(422).json(erro);
    }
    let usuario = setUsuario(body);
    knex.insert(usuario)
        .into('usuario')
        .then(response => res.status(201).json())
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao processar usuário: ' + err.message
            });
        });
});

app.post('/api/seguranca/login', (req, res) => {
    let body = req.body;
    let erro = validarLogin(body);
    if (erro.erros.length > 0) {
        return res.status(422).json(erro);
    }
    knex.select('*')
        .from('usuario')
        .where({login: body.login})
        .then(usuarios => {
            if (usuarios.length) {
                let usuario = usuarios[0];
                let senhaCorreta = bcrypt.compareSync(body.senha, usuario.senha);
                if (senhaCorreta) {
                    let token = jwt.sign(
                        {id: usuario.id},
                        process.env.SECRET_KEY,
                        {expiresIn: 3600}
                    );
                    return res.status(200).json({
                        id: usuario.id,
                        login: usuario.login,
                        nome: usuario.nome,
                        roles: usuario.roles,
                        token: token
                    });
                }
            }
            res.status(422).json({message: 'Usuário ou senha inválidos.'});
        })
        .catch(err => {
            res.status(404).json({
                message: 'Erro ao processar login: ' + err.message
            });
        });
});

app.listen(port, () => {
    console.log(`Listen on port ${port}`)
});

function validarProduto(body) {
    let erro = {
        erros: []
    };
    if (!body['descricao']) {
        erro.erros.push({descricao: 'O campo descricao é obrigatório.'});
    }
    if (!body['valor']) {
        erro.erros.push({valor: 'O campo valor é obrigatório.'});
    }
    if (!body['marca']) {
        erro.erros.push({marca: 'O campo marca é obrigatório.'});
    }
    return erro;
}

function validarUsuario(body) {
    let erro = {
        erros: []
    };
    if (!body['nome']) {
        erro.erros.push({nome: 'O campo nome é obrigatório'});
    }
    if (!body['email']) {
        erro.erros.push({email: 'O campo email é obrigatório'});
    }
    if (!body['login']) {
        erro.erros.push({login: 'O campo login é obrigatório'});
    }
    if (!body['senha']) {
        erro.erros.push({senha: 'O campo senha é obrigatório'});
    }
    return erro;
}

function validarLogin(body) {
    let erro = {
        erros: []
    };
    if (!body['login']) {
        erro.erros.push({login: 'O campo login é obrigatório'});
    }
    if (!body['senha']) {
        erro.erros.push({senha: 'O campo senha é obrigatório'});
    }
    return erro;
}

function setProduto(dados, produto = null) {
    if (!produto) {
        produto = {};
    }
    produto.descricao = dados.descricao;
    produto.valor = dados.valor;
    produto.marca = dados.marca;
    return produto;
}

function setUsuario(dados, usuario = null) {
    if (!usuario) {
        usuario = {};
    }
    usuario.nome = dados.nome;
    usuario.email = dados.email;
    usuario.login = dados.login;
    usuario.senha = bcrypt.hashSync(dados.senha, 8);
    return usuario;
}
