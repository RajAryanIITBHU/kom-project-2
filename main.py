import numpy as np
from scipy.optimize import fsolve

# Inputs
L1 = float(input("Enter fixed link length (L1): "))
L2 = float(input("Enter crank length (L2): "))
L3 = float(input("Enter coupler length (L3): "))
L4 = float(input("Enter follower length (L4): "))
omega2 = float(input("Enter crank angular velocity (omega2): "))

# Your version for multiple angles
angles_input = input("Enter crank angles (space separated): ")
angles_str = angles_input.split()

angles_deg = []
for x in angles_str:
    angles_deg.append(float(x))

print("\nResults:\n")

for theta2_deg in angles_deg:
    theta2 = np.radians(theta2_deg)

    # Position analysis (solve for theta3, theta4)
    def equations(x):
        theta3, theta4 = x
        eq1 = L2*np.cos(theta2) + L3*np.cos(theta3) - L4*np.cos(theta4) - L1
        eq2 = L2*np.sin(theta2) + L3*np.sin(theta3) - L4*np.sin(theta4)
        return [eq1, eq2]

    theta3, theta4 = fsolve(equations, [0.5, 0.5])

    # Velocity analysis
    A = np.array([
        [-L3*np.sin(theta3), L4*np.sin(theta4)],
        [L3*np.cos(theta3), -L4*np.cos(theta4)]
    ])

    B = np.array([
        L2 * omega2 * np.sin(theta2),
        -L2 * omega2 * np.cos(theta2)
    ])

    omega3, omega4 = np.linalg.solve(A, B)

    # Acceleration analysis
    B_acc = np.array([
        L2*omega2**2*np.cos(theta2) + L3*omega3**2*np.cos(theta3) - L4*omega4**2*np.cos(theta4),
        L2*omega2**2*np.sin(theta2) + L3*omega3**2*np.sin(theta3) - L4*omega4**2*np.sin(theta4)
    ])

    alpha3, alpha4 = np.linalg.solve(A, B_acc)

    # Output
    print(f"Angle θ2: {theta2_deg}°")
    print(f"ω3: {omega3:.4f}, ω4: {omega4:.4f}")
    print(f"α3: {alpha3:.4f}, α4: {alpha4:.4f}")
    print("-----------------------------")