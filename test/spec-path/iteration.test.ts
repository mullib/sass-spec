import fs from "fs"
import path from "path"
import child_process from "child_process"
import { fromPath, SpecPath } from "../../lib-js/spec-path"

describe("SpecPath iteration", () => {
  describe("withRealFiles", () => {
    let dir: SpecPath

    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/basic.hrx"))
    })

    afterEach(async () => {
      // Delete the created directory in case the test didn't work
      // FIXME this cleanup makes test execution slow
      if (fs.existsSync(dir.path)) {
        await fs.promises.rmdir(dir.path, { recursive: true })
      }
    })

    it("creates the archive directory and writes input scss files", async () => {
      await dir.withRealFiles(async () => {
        expect(fs.existsSync(dir.path)).toBeTruthy()
        expect(fs.existsSync(path.resolve(dir.path, "input.scss"))).toBeTruthy()
        expect(fs.existsSync(path.resolve(dir.path, "_util.scss"))).toBeTruthy()
        // Does not write output.css files or non-CSS/Sass files
        expect(fs.existsSync(path.resolve(dir.path, "output.css"))).toBeFalsy()
        expect(fs.existsSync(path.resolve(dir.path, "warning"))).toBeFalsy()
      })
    })

    it("deletes the directory on error", async () => {
      try {
        await dir.withRealFiles(async () => {
          throw new Error("Fail!")
        })
      } catch (e) {}
      expect(fs.existsSync(dir.path)).toBeFalsy()
    })

    it.skip("deletes the directory if the process exits", () => {
      const scriptPath = path.resolve(__dirname, "./fixtures/exit.ts")
      child_process.execSync(`npx ts-node ${scriptPath} exit`)
      expect(fs.existsSync(dir.path)).toBeFalsy()
    })

    it.skip("deletes the directory on an interrupt", () => {
      const scriptPath = path.resolve(__dirname, "./fixtures/exit.ts")
      child_process.execSync(`npx ts-node ${scriptPath} SIGINT`)
      expect(fs.existsSync(dir.path)).toBeFalsy()
    })
    it.todo("writes files to archive if option is enabled")
    it.todo("does not rearrange files when there were no changes made")
  })

  describe("forEachTest", () => {
    let dir: SpecPath
    beforeAll(async () => {
      dir = await fromPath(path.resolve(__dirname, "./fixtures/iterate"))
    })

    it("iterates through all test directories", async () => {
      const testCases: string[] = []
      await dir.forEachTest([], async (subdir) => {
        testCases.push(subdir.relPath())
      })
      expect(testCases).toContain("physical")
      expect(testCases).toContain("archive/scss")
      // counts directories with input.sass as valid
      expect(testCases).toContain("archive/indented")
      // does not iterate through directories without an input file
      expect(testCases).not.toContain("archive/no-input")
    })

    it.todo("works when passed in path arguments")
  })
})