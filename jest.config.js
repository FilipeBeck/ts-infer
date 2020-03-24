module.exports = {
	globals: {
		"ts-jest": {
			compiler: "@filipe.beck/typescript-x",
			tsConfig: "./test/tsconfig.json"
		}
	},
	roots: [
		"<rootDir>/test"
	],
	transform: {
		"^.+\\.tsx?$": "ts-jest"
	}
}