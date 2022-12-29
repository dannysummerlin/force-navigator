import { lisan } from "lisan"
const currentDictionary = require("languages/en-US.js")
lisan.add(currentDictionary)
/*
const translated = lisan.t('hello.person', {
  name: 'John Doe',
});
*/

export const languageHandler = {
	"lisan": lisan,
	"translate": lisan.t,
	"changeDictionary": (newLanguage) => lisan.add(require("languages/" + newLanguage + ".js")),
}