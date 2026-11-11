import {register} from 'tsx/esm/api'

/* Registriert tsx mit der Test-tsconfig, damit JSX automatisch (react-jsx) transformiert wird. */
register({tsconfig: new URL('../../tsconfig.test.json', import.meta.url).pathname})
