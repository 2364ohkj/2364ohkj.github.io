import warnings
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

import time
import matplotlib.patches as patches
from mpl_toolkits.mplot3d import Axes3D
from IPython.display import clear_output

# plot functions 

def loss_func_visualizer(current_weight, X, y , epoch):

    w_cord = np.linspace(-1,2,100)
    
    errors = np.zeros(100)
    for i, w in enumerate(w_cord) :
        errors[i] += ((w * X - y)**2).mean()

    updated_y_pred = current_weight*X
    updated_error = ((updated_y_pred - y)**2).mean()

    plt.plot(w_cord, errors, label = f'epoch : {epoch}', c = 'navy')
    plt.scatter(current_weight, updated_error, c= 'r')
    plt.legend()
    plt.xlabel('W')
    plt.ylabel('Loss')
    plt.title('W-Loss Plot')
    plt.show()

def data_fitted_visualizer(X, y, y_pred, epoch):
    plt.scatter(X, y, c = "navy", label = f"epoch : {epoch}")
    plt.legend()
    plt.plot(X, y_pred, c = "r")
    plt.xlim(min(X)-0.5, max(X)+0.5)
    plt.ylim(min(y)-0.5, max(y)+0.5)

def mesh_loss_out_generator(X,y,  w_scope : tuple , b_scope : tuple, size: int ):
    W_data = np.linspace(w_scope[0],w_scope[1], size)
    b_data = np.linspace(b_scope[0],b_scope[1], size)
    W_mesh, b_mesh = np.meshgrid(W_data, b_data)
    loss_out = np.zeros(shape = (size,size))

    for i, w in enumerate(W_data):
        for j, b in enumerate(b_data) :
            loss_out[j,i] += (((w*X+b)-y)**2).mean()

    return W_mesh, b_mesh , loss_out 


def loss_func_visualizer_3d(current_weight, current_b, W_mesh, b_mesh, loss_out, X, y, ax, angle : tuple, clear = False):
    
    ax.scatter(current_weight, current_b,np.arange(0,400,2), c= 'r', s=5)
    ax.plot_surface(W_mesh, b_mesh, loss_out, cmap=plt.cm.coolwarm)
    ax.set_xlabel("W", labelpad=16)
    ax.set_ylabel("b", labelpad=16)
    ax.set_title("error")
    ax.text(current_weight, current_b, ((current_weight*X+current_b-y)**2).mean(),
            f"W: {current_weight:.1f},\nb:{current_b:.1f},\nLoss:{((current_weight*X+current_b-y)**2).mean():.2f}", 
            color='red', zorder = 9)
    ax.view_init(angle[0], angle[1])
    plt.title('W-Loss Plot')
    
    if clear == True :
        plt.show()
        clear_output(wait=True)

def contour_2d(current_weight, current_b, W_mesh, b_mesh, loss_out, ax, cmap_color, x_label, y_label):
    ax.contourf(W_mesh, b_mesh, loss_out, cmap=cmap_color)
    ax.text(current_weight, current_b, f'{current_weight:.2f}, {current_b:.2f}', c = 'white')
    ax.scatter(current_weight, current_b, s=30, zorder = 12, color= 'white', label = f'{current_weight:.2f}, {current_b:.2f}')
    ax.legend()
    ax.set_xlabel(x_label)
    ax.set_ylabel(y_label)


# circle fitting 
    
def make_circle(n_samples : int,  noise : float, radius : float, center : tuple ) -> tuple :

    circ_x = radius * np.cos(np.linspace(0, 2*np.pi, n_samples)) + center[0]
    circ_y = radius * np.sin(np.linspace(0, 2*np.pi, n_samples)) + center[1]
    
    X = np.vstack(
        [circ_x, circ_y]
    ).T
    
    X += np.random.rand(n_samples, 2)

    ### shuffle
    np.random.shuffle(X)
    
    return X[:,0], X[:,1]

def plot_circle_fit(x, y, a, b, r, loss, epoch, interval : int, sleep_time : float, 
                    batched : bool, batch_x = None, batch_y = None,
                    axis_lim = [-1,8,-1,8]):
    if epoch%interval == 0 :
        plt.figure(figsize = (5,5))
        X = np.array([-15,20])
        Y = np.array([-15,20])
        plt.plot(X,Y,color='None', label = f'epoch : {epoch}, a: {a:.2f}, b: {b:.2f}, r: {r:.2f}, loss: {loss:.2f}')
        plt.axis(axis_lim)
        shp= patches.Circle((a,b), radius = r, color='g', fill = False)
        plt.gca().add_patch(shp)
        plt.scatter(x, y, c = 'navy')
        if batched:
            plt.scatter(batch_x, batch_y, c = 'red')
        plt.legend()
        plt.show()
        time.sleep(sleep_time)
        clear_output(wait=True)