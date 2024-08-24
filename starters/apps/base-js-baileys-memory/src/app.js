import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { BaileysProvider as Provider } from '@builderbot/provider-baileys'

const PORT = process.env.PORT ?? 3008

const menuFlow = addKeyword<Provider, Database>(['menu', 'opciones'])
    .addAnswer(
        [
            '📋 MENU GENIUS 📋',
            '1. Hablar con un representante',
            '2. Consultar saldo de cuenta',
            '3. Solicitar soporte técnico',
            '4. Ver los últimos movimientos',
            '0. Salir',
            '',
            'Por favor, responde con el número de la opción que deseas.',
        ].join('\n'),
        { delay: 800, capture: true },
        async (ctx, { fallBack, flowDynamic }) => {
            const userInput = ctx.body.trim();

            switch (userInput) {
                case '1':
                    return flowDynamic('Conectando con un representante...');
                case '2':
                    return flowDynamic('Su saldo es de $500.');
                case '3':
                    return flowDynamic('Conectando con el departamento de soporte técnico...');
                case '4':
                    return flowDynamic([
                        'Estos son tus últimos movimientos:',
                        '1. Pago de $100',
                        '2. Recarga de $50',
                    ].join('\n'));
                case '0':
                    return flowDynamic('Gracias por contactar con nosotros.');
                default:
                    return fallBack('Opción no válida. Intente de nuevo.');
            }
        }
    );

const welcomeFlow = addKeyword(['hi', 'hello', 'hola'])
    .addAnswer(`✨Bienvenid@ a nuestro centro de atención ✨`)
    .addAnswer(
            '👏 En que te podemos ayudar el día de hoy 👏')
    .addAnswer(
        'Escribe *menu* para ver las opciones disponibles.',
        { delay: 800 },
        [menuFlow]
    );
    
const fullSamplesFlow = addKeyword(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, registerFlow, fullSamplesFlow])
    
    const adapterProvider = createProvider(Provider)
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
