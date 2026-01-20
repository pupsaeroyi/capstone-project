import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function Register() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });

  const handleRegister = () => {
    console.log('Register clicked', formData);
    // note: connect to backend later
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <View style={styles.formCard}>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>To the club</Text>
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.formCard}>
          <Input
            placeholder="Full Name"
            value={formData.fullName}
            onChangeText={(text) =>
              setFormData({ ...formData, fullName: text })
            }
          />

          <Input
            placeholder="Email"
            value={formData.email}
            onChangeText={(text) =>
              setFormData({ ...formData, email: text })
            }
          />

          <Input
            placeholder="Username"
            value={formData.username}
            onChangeText={(text) =>
              setFormData({ ...formData, username: text })
            }
          />

          <Input
            placeholder="Password"
            value={formData.password}
            onChangeText={(text) =>
              setFormData({ ...formData, password: text })
            }
            secureTextEntry
          />

          <Input
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            secureTextEntry
          />

          {/* Register Button */}
          <View style={styles.buttonWrapper}>
            <Button title="Register" onPress={handleRegister} />
          </View>
        </View>

        {/* Back to Login */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account?</Text>
          <Link href="/login" style={styles.loginLink}>
            Back to Login
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingTop: 60,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: -6,
  },

  form: {
    width: '100%',
    alignItems: 'center',
  },

  formCard: {
    width: '85%',
    marginBottom: 32,
  },

  buttonWrapper: {
    marginTop: 12,
  },

  loginContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 5,
  },

  loginText: {
    fontSize: 14,
    color: '#666',
  },

  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
