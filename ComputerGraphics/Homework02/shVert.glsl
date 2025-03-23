#version 300 es

layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aColor;

out vec3 ourColor;
uniform float dx;
uniform float dy;

void main() {
    gl_Position = vec4(aPos[0] + dx, aPos[1] + dy, 0.0, 1.0);
    ourColor = aColor;
}