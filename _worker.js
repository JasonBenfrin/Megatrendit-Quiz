class QuizCache {
  static metas
  static metaAnswers = new Map()
}

export default {
  /**
   * @param {Request} request 
   * @param {{}} env 
   */
  async fetch(request, env) {
    const url = new URL(request.url)
    if (
      url.pathname.startsWith('/check') &&
      request.method == "POST" &&
      request.headers.get("Content-Type") == "application/json"
    ) {
      const metas = QuizCache.metas || await (await env.ASSETS.fetch(new URL('/quizes/metas.json', url))).json()
      QuizCache.metas = metas
      const data = await request.json()
      console.log(JSON.stringify(data.answers))
      const currentMeta = metas[data.meta]
      const correctAnswers = QuizCache.metaAnswers.get(currentMeta) || await (await env.ASSETS.fetch(new URL(`/quizes/answers/${currentMeta}`, url))).json()
      QuizCache.metaAnswers.set(currentMeta, correctAnswers)
      if (correctAnswers.length != data.answers.length) return new Response(JSON.stringify({success: false, error: "Answer all the questions"}), {headers: {"Content-Type": "application/json"}})
      let allCorrect = true
      correctAnswers.forEach((correctAnswer, i) => {
        const userAnswer = data.answers[i]
        if (typeof userAnswer == 'object') {
          const correctEntries = (Object.entries(correctAnswer))
          const userEntries = Object.entries(userAnswer)
          if (correctEntries.length != userEntries.length) allCorrect = false
          userEntries.forEach(([key, value]) => {
            if (correctAnswer[key] != value) allCorrect = false
          })
        } else if (userAnswer != correctAnswer) allCorrect = false
      })

      if (allCorrect) {
        return new Response(JSON.stringify({success: true, error: null}), {headers: {"Content-Type": "application/json"}})
      } else {
        return new Response(JSON.stringify({success: false, error: "Wrong answer"}), {headers: {"Content-Type": "application/json"}})
      }
    }
    return env.ASSETS.fetch(request)
  }
}