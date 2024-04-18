const SERVER = axios.create({ baseURL: 'http://localhost:7007' })
const DELAY = 2000;

const controller = new AbortController();
const signal = controller.signal;

//ЗАДЕРЖКА ДЛЯ ВСЕХ ЗАПРОСОВ
SERVER.interceptors.request.use(
    config => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(config), DELAY);
        });
    },
    error => {
        return Promise.reject(error);
    }
);

//СООБЩЕНИЕ ОБ ОШИБКЕ, ЕСЛИ СЕРВЕР НЕДОСТУПЕН
SERVER.interceptors.response.use(
    res => {
        if (res.data.err) {
            showError(typeof res.data.err == "string" ? res.data.err :
                JSON.stringify(res.data.err))
            return Promise.reject(res.data.err)
        }
        else return res
    },
    (error) => {
        showError(error.message)
    }
);

let ERROR = false

const id = id => document.getElementById(id)

const BOOK_PUSHKIN = {
    "author": "Pushkin",
    "title": "Eugene Onegin"
}

const BOOK_LERMONTOV = {
    "author": "Lermontov",
    "title": "Mzyri"
}

const BOOK_SHEVCHENKO = {
    "author": "Shevchenko",
    "title": "Kobzar"
}

async function addBook(book) {
    await SERVER.post('/books', book);
    await loadBooks()
}

async function getBookById(id) {
    return await SERVER.get('/books/' + id);
}

//ОСТАНОВКА ЗАПРОСА ПО НАЖАТИЮ НА КНОПКУ ABORT
async function getBooks(request = {}) {
    return await SERVER.get('/books', { signal });
}

//ЕСЛИ УСТАНОВИТЬ В TIMEOUT МЕНЬШЕ ЧЕМ ЗАДЕРЖКА, ТО ЗАПРОС ОСТАНОВИТСЯ
async function getSelections(request = {}) {
    return await SERVER.get('/selections', { signal: AbortSignal.timeout(3000) });
}

async function removeBook(id = {}) {
    await SERVER.delete('/books/' + id);
    await loadBooks()
}

async function loadBooks() {
    await showBooks()
    await fillBooksSelect()
}

async function loadSelections() {
    await showSelections()
    await fillSelectionSelect()
}

async function removeSelection(id = {}) {
    await SERVER.delete('/selections/' + id);
    await loadSelections()
}

async function showBooks() {
    const booksArea = id("booksArea")
    const res = await getBooks()
    const books = res.data
    booksArea.innerHTML = `<ul>` +
        books.map(book => `<li><b>${book.title}</b> by ${book.author}
            <button onclick="removeBook('${book._id}')">delete</button></li>`)
            .join("")
        + `</ul>`
}

async function fillBooksSelect() {
    const booksSelect = id("booksSelect")
    const res = await getBooks()
    const books = res.data
    booksSelect.innerHTML = books.map(book =>
        `<option value='${book._id}'>
            <b>${book.title}</b> by ${book.author}
        </option>`
    )
}

async function fillSelectionSelect() {
    const selectionsSelect = id("selectionsSelect")
    const selections = (await getSelections()).data
    if (selections.length === 0) return
    const value = selectionsSelect.value || selections[0]._id
    selectionsSelect.innerHTML = selections.map(selection =>
        `<option value='${selection._id}'>
            <b>${selection.title}</b> by ${selection.author}
        </option>`
    )
    selectionsSelect.value = value
}

async function showSelections() {
    const selectionsArea = id("selectionsArea")
    const selections = (await getSelections()).data
    let selectionsAreaHTML = ""
    for await (let selection of selections) {
        let booksHTML = ""
        if (selection.books) {
            for await (let id of selection.books) {
                const book = (await getBookById(id)).data
                booksHTML += `<li>
                    ${book.title} by ${book.author}
                    <button onclick="removeBookFromSelection(
                            '${id}','${selection._id}')">
                        delete
                    </button>
                </li>`
            }
        }
        selectionsAreaHTML +=
            `<li>
                <b>${selection.title}</b> by ${selection.author} (${selection.email})
                <button onclick="removeSelection('${selection._id}')">
                    delete
                </button>
                <ul>${booksHTML}</ul>
            </li>`
    }
    selectionsArea.innerHTML = "<ul>" + selectionsAreaHTML + "</ul>"
}

async function addBookToSelection({ bookId, selectionId }) {
    await SERVER.post("/selections/" + selectionId + "/books", [bookId]);
}

async function removeBookFromSelection(bookId, selectionId) {
    await SERVER.delete("/selections/" + selectionId + "/books/" + bookId);
    await loadSelections()
}

async function addBookToSelectionButton() {
    const form = getFormData("#addBookToSelectionForm select")
    await addBookToSelection(form)
    await loadSelections()
}

async function addBookButton() {
    const form = getFormData("#bookForm input")
    let { title, author } = form
    if (title.length === 0 || author.length === 0) {
        showError("title and author are required")
    } else {
        await addBook(form)
        clearForm("#bookForm input")
    }
}

async function addSelection(selection) {
    await SERVER.post("/selections", selection)
}

function getFormData(selector) {
    const res = {}
    document.querySelectorAll(selector)
        .forEach(input => {
            res[input.name] = input.value
        })
    return res;
}

function clearForm(selector) {
    document.querySelectorAll(selector)
        .forEach(input => {
            input.value = ""
        })
}

async function addSelectionButton() {
    const selection = getFormData("#selectionForm input")
    let { title, author } = selection
    if (title.length === 0 || author.length === 0) {
        showError("title and author are required")
    } else {
        await addSelection(selection)
        await loadSelections()
        clearForm("#selectionForm input")
    }
}

//ФУНКЦИЯ ОСТАНОВКИ ЗАПРОСА ЧЕРЕЗ AbortController
function abortRequest() {
    controller.abort();
    console.log('aborted');
};

function showError(err) {
    id('errorArea').style.display = 'block'
    id('errorArea').innerHTML = "ERROR: " + err
    ERROR = true
}

function hideError() {
    if (ERROR) {
        id('errorArea').style.display = 'none'
        ERROR = false
    }
}

async function run() {
    await loadBooks()
    await loadSelections()
}