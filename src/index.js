import app from './app'
import { createConection } from './lib/db'
createConection()

app.listen(app.get('port'), () => {
	console.log('Server on port', app.get('port'))
})