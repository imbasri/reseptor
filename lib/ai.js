export function parseAiIngredients(text){
  try{
    const jsonStart = text.indexOf('[')
    const jsonEnd = text.lastIndexOf(']')
    if(jsonStart>=0 && jsonEnd>=0){
      const arr = JSON.parse(text.slice(jsonStart, jsonEnd+1))
      return arr
    }
  }catch{}
  // fallback: split lines
  return text.split(/\n|,|•|-/).map(s=>s.trim()).filter(Boolean).map(x=>({name:x}))
}
