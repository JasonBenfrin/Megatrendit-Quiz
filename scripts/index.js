;(async () => {
// TODO: add hint

class QuizCache {
  static metas
  static currentMeta
}

const quizContainer = document.querySelector('.quiz-container')
const template = document.querySelector('template#quiz-temp')
const choiceTemp = document.querySelector('template#quiz-choice')
const matchTemp = document.querySelector('template#quiz-match')
const form = document.querySelector('form.quiz-form')
const submitButton = document.querySelector('button.submit')
const warning = document.querySelector('p.error')
const quizTop = document.querySelector('p.page:first-child')
const currPage = document.querySelectorAll('p.page span.curr')
const totalPage = document.querySelectorAll('p.page span.total')
const time = document.querySelector('span.time')
const winContainer = document.querySelector('.win-container')
const resetButton = document.querySelector('button.reset')
const youWin = document.querySelector('.info h1')

const wrong = new Audio('/assets/sounds/wrong.mp3')
wrong.volume = 1
const correct = new Audio('/assets/sounds/correct.mp3')
correct.volume = .2
const win = new Audio('/assets/sounds/win.mp3')
win.volume = .5

const metas = await axios.get('/quizes/metas.json')
QuizCache.metas = metas.data
const level = parseInt(localStorage.getItem('lvl') || 0)
if (level >= metas.data.length) showWinScreen()
else {
  prepareQuiz(level)
  var clock = setInterval(() => localStorage.setItem('time', (parseInt(localStorage.getItem('time')) || 0)+1), 1000);
}
totalPage.forEach(span => span.textContent = metas.data.length)

form.addEventListener('submit', async e => {
  e.preventDefault()
  warning.textContent = ''
  const quizes = form.querySelectorAll('fieldset')
  const data = {
    meta: QuizCache.currentMeta,
    answers: []
  }
  let failed = false
  for (const quiz of quizes) {
    try {
      switch (quiz.dataset.type) {
        case "choice":
          data.answers.push(submitChoice(quiz))
          break;
        case "match":
          data.answers.push(submitMatch(quiz))
          break;
      }
    } catch {
      warning.textContent = 'Answer all the questions'
      quiz.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center"
      })
      quiz.style.borderColor = 'red'
      setTimeout(() => {
        quiz.style.removeProperty('border-color')
        warning.textContent = ''
      }, 10000);
      failed = true
      fail()
      break;
    }
  }
  if (failed) return
  const result = (await axios.post('/check', data, {
    headers: {
      "Content-Type": "application/json"
    }
  })).data
  if (result.success) {
    const nextMeta = ++QuizCache.currentMeta
    if (nextMeta == QuizCache.metas.length) {
      finish()
    } else {
      success()
      prepareQuiz(nextMeta)
      quizTop.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "center"
      })
    }
  } else {
    fail()
    warning.textContent = result.error
  }
})

function fail() {
  wrong.play()
  submitButton.classList.add('wobble')
  setTimeout(() => {
    requestAnimationFrame(() => {
      submitButton.classList.remove('wobble')
    })
  }, 500);
}

function success() {
  correct.play()
}

function finish() {
  win.play()
  showWinScreen()
}

function showWinScreen() {
  clearInterval(clock)
  localStorage.setItem('lvl', QuizCache.metas.length)
  const playTime = localStorage.getItem('time')
  const hours = Math.floor(playTime / 3600).toString().padStart(2, '0')
  const mins = Math.floor(playTime / 60 % 60).toString().padStart(2, '0')
  const secs = (playTime % 60).toString().padStart(2, '0')
  time.textContent = `${hours}:${mins}:${secs}`
  winContainer.classList.remove('hide')
  quizContainer.classList.add('hide')
  youWin.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "center"
  })
}

resetButton.addEventListener('click', () => {
  localStorage.removeItem('lvl')
  localStorage.removeItem('time')
  location.reload()
})

function submitChoice(quiz) {
  const inputs = Array.from(quiz.querySelectorAll('input'))
  const selected = inputs.filter(input => input.checked == true)[0]
  if (!selected) throw ''
    let nth = parseInt(selected.id.split('-')[1])
    return ++nth
}

function submitMatch(quiz) {
  const buttons = quiz.querySelectorAll('.row-2 button')
  const ans = {}
  let i = 1
  for (const button of buttons) {
    if (button.classList.contains('enlarge')) continue
    if (!button.dataset.from) throw ''
    else {
      ans[button.dataset.from] = i.toString()
      i++
    }
  }
  return ans
}

function prepareQuiz(level = 0) {
  localStorage.setItem('lvl', level)
  if (level != 0) form.classList.add('zoom-start')
  setTimeout(async () => {
    QuizCache.currentMeta = level
    currPage.forEach(span => span.textContent = level+1)
    const quiz = await axios.get(`/quizes/${QuizCache.metas[level]}`)
    form.querySelectorAll('fieldset').forEach(fieldset => fieldset.remove())
    quiz.data.forEach(entry => {
      switch (entry.type) {
        case "choice":
          appendChoice(entry)
          break;
        case "match":
          appendMatch(entry)
          break;
      }
    })
    form.classList.remove('zoom-start')
    form.classList.add('zoom-end')
    requestAnimationFrame(() => {
      setTimeout(() => {
        form.classList.remove('zoom-end')
      }, 10)
    })
  }, 500);
}

function appendChoice(entry) {
  const quizEle = template.content.cloneNode(true)
  const fieldset = quizEle.querySelector('fieldset')
  fieldset.name = entry.id
  fieldset.dataset.type = entry.type
  if (entry.hint) {
    const hint = fieldset.querySelector('.hint')
    const hintHTML = entry.hint.replace(/(?:(https?\:\/\/[^\s]+))/m, '<a href="$1" target="_blank">$1</a>')
    hint.innerHTML = hintHTML
  } else fieldset.querySelector('details').remove()
  quizEle.querySelector('legend').textContent = entry.question
  entry.answers.forEach((answer, i) => {
    const choice = choiceTemp.content.cloneNode(true)
    const input = choice.querySelector('input')
    input.name = entry.id
    input.id = `${entry.id}-${i}`
    const label = choice.querySelector('label')
    label.textContent = answer
    label.setAttribute("for", `${entry.id}-${i}`)
    const quizData = fieldset.querySelector('.quiz-data')
    quizData.appendChild(choice)
  })
  form.insertBefore(fieldset, warning)
}

const svgAcc = []

function appendMatch(entry) {
  const quizEle = template.content.cloneNode(true)
  const fieldset = quizEle.querySelector('fieldset')
  fieldset.name = entry.id
  fieldset.dataset.type = entry.type
  quizEle.querySelector('legend').textContent = entry.question
  const hint = fieldset.querySelector('.hint')
  if (entry.hint) {
    const hintHTML = entry.hint.replace(/(?:(https?\:\/\/[^\s]+))/m, '<a href="$1">$1</a>')
    hint.innerHTML = hintHTML
  } else fieldset.querySelector('details').remove()
  const match = matchTemp.content.cloneNode(true)
  const row1 = match.querySelector('.row-1')
  const row2 = match.querySelector('.row-2')
  entry.row1.forEach((ques, i) => {
    const pair = entry.row2[i]
    const button1 = document.createElement('button')
    const button2 = document.createElement('button')
    button1.classList.add('node')
    button2.classList.add('node')
    button1.type = "button"
    button2.type = "button"
    button1.value = ques
    button2.value = pair
    insertRowEle(entry.row1Type, button1, ques, true)
    insertRowEle(entry.row2Type, button2, pair, false)
    row1.appendChild(button1)
    row2.appendChild(button2)
    const svg = match.querySelector('svg')
    svgAcc.push(svg)
    const path = document.createElementNS("http://www.w3.org/2000/svg", 'path')
    path.setAttribute('stroke', 'black')
    path.setAttribute('stroke-width', '2px')
    path.setAttribute('fill', 'none')
    svg.appendChild(path)
    button1.addEventListener('click', e => {
      button1.parentElement.querySelectorAll('button').forEach(button => button.classList.remove('selected'))
      button1.classList.add('selected')
    })
    button2.addEventListener('click', () => {
      const selectedButton = row1.querySelector('button.selected')
      if (!selectedButton) return
      const selectedButtonNth = getN(selectedButton)
      const connectedFrom = row2.querySelectorAll(`button[data-from="${selectedButtonNth}"]`)
      connectedFrom.forEach(ele => {
        const nth = getN(ele)
        const path = svg.querySelector(`path:nth-of-type(${nth})`)
        path.removeAttribute('d')
        delete ele.dataset.from
      })
      button2.dataset.from = selectedButtonNth
      selectedButton.classList.remove('selected')
      svgResizeHandler(svg)
    })
  })
  const quizData = fieldset.querySelector('.quiz-data')
  quizData.appendChild(match)
  form.insertBefore(fieldset, warning)
}

function insertRowEle(rowType, button, value, isFirst) {
  if (rowType == "string") {
    button.textContent = value
  } else if (rowType == "image") {
    const wrapper = document.createElement('div')
    const image = document.createElement('img')
    image.src = value
    const enlargeImg = document.createElement('img')
    enlargeImg.src = "/assets/images/zoom-in.svg"
    const enlarge = document.createElement('button')
    enlarge.classList.add('enlarge')
    enlarge.type = "button"
    enlarge.appendChild(enlargeImg)
    enlarge.addEventListener('click', e => {
      e.stopPropagation()
      image.classList.add('show')
      imgZoomOffsetHandler(image)
    })
    image.addEventListener('click', e => {
      if (image.classList.contains('show')) e.stopPropagation()
      image.classList.remove('show')
    })
    wrapper.appendChild(image)
    button.append(...(isFirst ? [enlarge, wrapper] : [wrapper, enlarge]))
  }
}
const getN = (e) => Array.from(e.parentElement.children).filter(a => a.tagName == e.tagName).indexOf(e)+1
const y = (count, n, height) => height/count*(n-.5)

function imgZoomOffsetHandler(image) {
  const { top } = image.parentElement.getBoundingClientRect()
  image.style.setProperty("--offset", `${-top}px`)
}

function svgResizeHandler(svg) {
  const bounds = svg.getBoundingClientRect()
  const height = bounds.height
  const width = bounds.width
  const row2 = svg.nextElementSibling
  const buttons = Array.from(row2.children)
  const count = buttons.length
  for (let i = 1; i <= count; i++) {
    const path = svg.querySelector(`path:nth-of-type(${i})`)
    const from = buttons[i-1].dataset.from
    if (!from) continue
    const selected = parseInt(from)
    const y1 = y(count, selected, height)
    const y2 = y(count, i, height)
    path.setAttribute('d', `M 0,${y1} C ${0.6*width},${y1} ${0.4*width},${y2} ${width},${y2}`)
  }
}

addEventListener('resize', () => {
  svgAcc.forEach(svg => svgResizeHandler(svg))
  document.querySelectorAll("img.show").forEach(img => imgZoomOffsetHandler(img))
})

addEventListener('scroll', () => {
  document.querySelectorAll("img.show").forEach(img => imgZoomOffsetHandler(img))
})
})();