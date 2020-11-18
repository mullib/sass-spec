import type SpecPath from "./spec-path"
import path from "path"

const HRX_SECTION_SEPARATOR = `
<===>
================================================================================
`

async function getFilesHrx(
  dir: SpecPath,
  root: string,
  filenames: string[]
): Promise<string> {
  const fileSections = await Promise.all(
    filenames.map(async (filename) => {
      const contents = await dir.contents(filename)
      const fullPath = path.resolve(dir.path, filename)
      const relPath = path.relative(root, fullPath)
      return `<===> ${relPath}\n${contents}`
    })
  )
  return fileSections.join("\n")
}

async function getSubdirsHrx(dir: SpecPath, root: string): Promise<string[]> {
  let sections: string[] = []
  for (const subdirName of await dir.subdirs()) {
    const subdir = await dir.subitem(subdirName)
    sections = sections.concat(await getHrxSections(subdir, root))
  }
  return sections
}

async function getDirectFileHrx(dir: SpecPath, root: string): Promise<string> {
  // TODO these filenames should be sorted alphabetically
  return await getFilesHrx(dir, root, await dir.files())
}

async function getNormaliDirHrx(
  dir: SpecPath,
  root: string
): Promise<string[]> {
  const directFiles = await getDirectFileHrx(dir, root)
  const subdirSections = await getSubdirsHrx(dir, root)
  return directFiles.length === 0
    ? subdirSections
    : [directFiles, ...subdirSections]
}

// Get the contents of the test directory in a standardized order
async function getTestDirHrx(dir: SpecPath, root: string): Promise<string> {
  const inputFile = dir.inputFile()
  const filenames = await dir.files()
  // FIXME make sure the base output file is listed first
  const outputFiles = filenames
    .filter((name) => name.startsWith("output-"))
    .sort()
  const warningFiles = filenames
    .filter((name) => name.startsWith("warning"))
    .sort()
  const errorFiles = filenames.filter((name) => name.startsWith("error")).sort()
  const otherFiles = filenames.filter((name) => {
    return !/^(output|error|warning|input\.s[ac]ss|options\.yml)/.test(name)
  })
  const subdirSections = await getSubdirsHrx(dir, root)

  return [
    dir.hasFile("options.yml")
      ? await getFilesHrx(dir, root, ["options.yml"])
      : "",
    await getFilesHrx(dir, root, [inputFile]),
    await getFilesHrx(dir, root, otherFiles),
    subdirSections.join("\n"),
    dir.hasFile("output.css")
      ? await getFilesHrx(dir, root, ["output.css"])
      : "",
    await getFilesHrx(dir, root, outputFiles),
    await getFilesHrx(dir, root, warningFiles),
    await getFilesHrx(dir, root, errorFiles),
  ]
    .filter((str) => str)
    .join("\n")
}

async function getHrxSections(dir: SpecPath, root: string): Promise<string[]> {
  if (dir.isTestDir()) {
    return [await getTestDirHrx(dir, root)]
  } else {
    return getNormaliDirHrx(dir, root)
  }
}

/**
 * Write the contents of this directory to an HRX file.
 */
export async function toHrx(dir: SpecPath): Promise<string> {
  const sections = await getHrxSections(dir, dir.path)
  return sections.join(HRX_SECTION_SEPARATOR)
}