import sharp from 'sharp'

export async function processSignatureImage(inputPath: string): Promise<string> {
    const input = sharp(inputPath)
    const metadata = await input.metadata()
    let processed

    if (metadata.hasAlpha) {
        processed = input
            .resize({ width: 800, withoutEnlargement: true })
            .png({ compressionLevel: 9, force: true })
    } else {
        processed = input
            .greyscale()
            .normalize()
            .linear(1.5, -50)
            .flatten({ background: '#ffffff' })
            .resize({ width: 800, withoutEnlargement: true })
            .png({ compressionLevel: 9, force: true })
    }

    const processedBuffer = await processed.toBuffer()
    return processedBuffer.toString('base64')
}

export async function processSignatureFromBase64(base64Input: string): Promise<string> {
    const buffer = Buffer.from(base64Input, 'base64')
    const input = sharp(buffer)
    const metadata = await input.metadata()
    let processed

    if (metadata.hasAlpha) {
        processed = input
            .resize({ width: 800, withoutEnlargement: true })
            .png({ compressionLevel: 9, force: true })
    } else {
        processed = input
            .greyscale()
            .normalize()
            .linear(1.5, -50)
            .flatten({ background: '#ffffff' })
            .resize({ width: 800, withoutEnlargement: true })
            .png({ compressionLevel: 9, force: true })
    }

    const processedBuffer = await processed.toBuffer()
    return processedBuffer.toString('base64')
}
