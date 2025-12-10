import * as THREE from 'three'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

// SCENE
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)

camera.position.set(-13.828, 9.834, 32.849)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)


// LOAD MODEL & BUILD COLLIDERS
let colliders = []
let interactions = []
const loader = new GLTFLoader()

// node variables 
let monitorScreen = null
let projectorScreen = null
let door = null
let doorCollider = null
let classroomLight1 = null
let classroomLight2 = null

loader.load('scene/project.glb', (gltf) => {
    const model = gltf.scene

    model.traverse((node) => {
        
        if (node.name === "mesh_42") { // Light switch interaction (for some reason it thinks light switch is mesh_42)


            let worldPos = node.getWorldPosition(new THREE.Vector3())

            // create light switch trigger
            const lightBox = new THREE.Box3().setFromCenterAndSize(
                worldPos,
                new THREE.Vector3(5, 15, 5)
            )

            // add interaction to list
            interactions.push({name: "light", box: lightBox, mesh: node})
        }
        if (node.name === "ClassroomDoor") { // door interaction


            door = node

            let actualMesh = null
            node.traverse((child) => {
                if (child.isMesh && child.name.toLowerCase().includes("classroom_door_1_1")) {actualMesh = child}
            })

            if (actualMesh) {

                
                let worldPos = actualMesh.getWorldPosition(new THREE.Vector3())

                // create door trigger
                const doorBox = new THREE.Box3().setFromCenterAndSize(
                    worldPos,
                    new THREE.Vector3(15, 15, 15)
                )

                // add interaction to list
                interactions.push({name: "door", box: doorBox, mesh: node})
            }
        }
        if (node.name === "MonitorScreen") { // turn off monitor screen
            monitorScreen = node
            monitorScreen.visible = false
        }
        if (node.name === "ProjectorScreen") { // turn oof projector screen
            projectorScreen = node
            projectorScreen.visible = false
        }
        if (node.name === "Monitor") { // Monitor / projector interaction
            let actualMesh = null
            node.traverse((child) => {
                if (child.isMesh && child.name.toLowerCase().includes("monitor")) {actualMesh = child}
            })

            if (actualMesh) {
                
                let worldPos = actualMesh.getWorldPosition(new THREE.Vector3())

                // create a trigger box on the actual mesh
                const monitorBox = new THREE.Box3().setFromCenterAndSize(
                    worldPos,
                    new THREE.Vector3(10, 8, 10)
                )

                // add interaction to list
                interactions.push({name: "monitor", box: monitorBox, mesh: node})
                
            }
        }
        if (node.isMesh && !["ClassroomDoorway", "doorwayFront", "doorwayFront_1", "door_1_1", "door_1_2"].includes(node.name)) {

            node.updateWorldMatrix(true, false);
            
            if (node.name === "Classroom_door_1_1") { // metal part of door
                const box = new THREE.Box3().setFromObject(node);
                doorCollider = {name: node.name, mesh: node, box}

                colliders.push(doorCollider)
            }
            else {
                const box = new THREE.Box3().setFromObject(node);
                colliders.push({ name: node.name, mesh: node, box });
            }
        }

        if (node.isLight) {
            node.intensity = 300;
            node.visible = true;

            if (node.name === "FrontClassroomPointLight") {
                classroomLight1 = node
            }
            if (node.name === "BackClassroomPointLight") {
                classroomLight2 = node
            }
        }
    })
    
    scene.add(model)
})


// PLAYER HITBOX
const playerSize = new THREE.Vector3(0.6, 1.7, 0.6)
const playerBox = new THREE.Box3()


// MOVEMENT + COLLISION
const controls = new PointerLockControls(camera, renderer.domElement)
scene.add(controls)

document.addEventListener('click', () => controls.lock())

let keys = {}
window.addEventListener("keydown", (e) => keys[e.key] = true)
window.addEventListener("keyup", (e) => keys[e.key] = false)

function moveWithCollision(dir) {
    const prev = camera.position.clone()

    controls.moveRight(dir.x)
    controls.moveForward(dir.z)

    // Update player hitbox: shift it down so it's around the body, not the eyes
    const center = camera.position.clone()
    center.y = 5  // shift down by half the height

    playerBox.setFromCenterAndSize(center, playerSize)

    // Collision test
    for (let c of colliders) {
        if (playerBox.intersectsBox(c.box)) {
            camera.position.copy(prev)
            break
        }
    }
}


function updateMovement() {
    if (!controls.isLocked) return

    let dir = new THREE.Vector3()
    const speed = 0.2

    if (keys['w']) dir.z = speed
    if (keys['s']) dir.z = -speed
    if (keys['a']) dir.x = -speed
    if (keys['d']) dir.x = speed

    moveWithCollision(dir)
}

// Interactons

    // Projection interaction
    let monitorStatus = false // true = on, false = off; default off
    let doorStatus = false // true = open, false = closed; default closed
    let lightStatus = true // true = on, false = off; default on

    // if key is pressed
    window.addEventListener("keydown", (e) => {
        keys[e.key] = true

        if (e.key.toLowerCase() === 'e') { // if 'e' is pressed

            for (let i of interactions) { // iterate through all interaction triggers

                if (playerBox.intersectsBox(i.box)) { // if player is in one of the interaction trigger

                    if (i.name === "monitor") {// if player is in monitor trigger
                        if (!monitorStatus) {
                            monitorScreen.visible = true
                            projectorScreen.visible = true
                            monitorStatus = true
                        }
                        else {
                            monitorScreen.visible = false
                            projectorScreen.visible = false
                            monitorStatus = false
                        }
                    }
                    if (i.name === "door") { // if player is in the door trigger
                        if (!doorStatus) {
                            doorStatus = true
                        }
                        else {
                            doorStatus = false
                        }

                    }
                    if (i.name === "light") { // if player is in the light switch trigger
                        if (lightStatus) {
                            classroomLight1.intensity = 3
                            classroomLight2.intensity = 3

                            lightStatus = false
                        }
                        else {
                            classroomLight1.intensity = 300
                            classroomLight2.intensity = 300

                            lightStatus = true
                        }
                    }
                }
            }
        }
    })


// LOOP

// display interactionHint when inside of a trigger

function updateInteractionHint() {
    let pressE = document.getElementById("pressE")

    for (let i of interactions) {
        if (playerBox.intersectsBox(i.box)) {
            pressE.style.display = "block"
            return
        }
    }

    pressE.style.display = "none"
}

function animate() {
    requestAnimationFrame(animate)

    if (door && doorCollider) {
        if (doorStatus) {
            if (door.rotation.y > -2.36) {
                door.rotation.y -= 0.02
                door.updateWorldMatrix(true)

                doorCollider.box.setFromObject(door)

            }
        }
        if (!doorStatus) {
            if (door.rotation.y < 0) {
                door.rotation.y += 0.02
                door.updateWorldMatrix(true)

                doorCollider.box.setFromObject(door)
            }
        }
    }
    updateMovement()
    updateInteractionHint()
    renderer.render(scene, camera)
}

animate()
