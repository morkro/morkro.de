import { spline } from 'https://cdn.skypack.dev/@georgedoescode/spline@1.0.1'
import SimplexNoise from 'https://cdn.skypack.dev/simplex-noise@2.4.0'

const simplex = new SimplexNoise()
const path = document.querySelector('#background-blob path')
const points = createPoints(8)
const noiseStep = 0.0025

function noise(x, y) {
	return simplex.noise2D(x, y)
}

function createPoints(numPoints) {
	const points = []
	const step = (Math.PI * 2) / numPoints
	const radius = 75

	for (let i = 1; i <= numPoints; i++) {
		const theta = i * step
		const x = 100 + Math.cos(theta) * radius
		const y = 100 + Math.sin(theta) * radius
		points.push({
			x,
			y,
			originX: x,
			originY: y,
			noiseOffsetX: Math.random() * 1000,
			noiseOffsetY: Math.random() * 1000,
		})
	}

	return points
}

function map(n, start1, end1, start2, end2) {
	return ((n - start1) / (end1 - start1)) * (end2 - start2) + start2
}

function animate() {
	path.setAttribute('d', spline(points, 1, true))

	for (let i = 0; i < points.length; i++) {
		const point = points[i]
		const nX = noise(point.noiseOffsetX, point.noiseOffsetX)
		const nY = noise(point.noiseOffsetY, point.noiseOffsetY)
		const x = map(nX, -1, 1, point.originX - 20, point.originX + 20)
		const y = map(nY, -1, 1, point.originY - 20, point.originY + 20)
		point.x = x
		point.y = y
		point.noiseOffsetX += noiseStep
		point.noiseOffsetY += noiseStep
	}

	requestAnimationFrame(animate)
}

export default function animateBackground() {
	console.log('animateBackground')
	animate()
}
