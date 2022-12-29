// object handling
export const fieldTypeData = (type, labelArray) => {
	switch(type.toUpperCase()) {
		case 'AUTONUMBER':
		case 'CHECKBOX':
		case 'DATE':
		case 'DATETIME':
		case 'EMAIL':
		case 'PHONE':
		case 'PICKLIST':
		case 'PICKLISTMS':
		case 'URL':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + type)
			break
		case 'CURRENCY':
		case 'NUMBER':
		case 'PERCENT':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + words[i] + ' <scale> <precision>') 
			break
		case 'GEOLOCATION':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + words[i] + ' <scale>')
			break
		case 'LOOKUP':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + words[i] + ' <lookup sObjectName>')
			break
		case 'TEXT':
		case 'TEXTAREA':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + words[i] + ' <length>')
			break
		case 'TEXTAREALONG':
		case 'TEXTAREARICH':
			return (labelArray[0] + ' ' + labelArray[1] + ' ' + labelArray[2] + ' ' + words[i] + ' <length> <visible lines>')
			break
		default:
			return null
			break
	}
}